const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { Event, Club, Registration, Review, User } = require('../models');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const { logAction, auditActions } = require('../utils/audit.utils');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   GET /api/events
// @desc    Get all events (public)
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      status = 'approved',
      category,
      clubId,
      search,
      upcoming,
      past,
      page = 1,
      limit = 12
    } = req.query;

    const query = {};

    // Status filter
    if (status) query.status = status;
    if (status === 'approved') query.isPublished = true;

    // Category filter
    if (category) query.category = category;

    // Club filter
    if (clubId) query.clubId = clubId;

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Upcoming events
    if (upcoming === 'true') {
      query.eventDate = { $gte: new Date() };
    }

    // Past events
    if (past === 'true') {
      query.eventDate = { $lt: new Date() };
    }

    const events = await Event.find(query)
      .populate('clubId', 'name logo')
      .populate('createdBy', 'name')
      .sort({ eventDate: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    // Check registration status for logged-in user
    let eventsWithRegistration = events;
    if (req.user) {
      const eventIds = events.map(e => e._id);
      const registrations = await Registration.find({
        userId: req.user.userId,
        eventId: { $in: eventIds }
      }).select('eventId status');

      const regMap = new Map(registrations.map(r => [r.eventId.toString(), r.status]));

      eventsWithRegistration = events.map(event => ({
        ...event.toObject(),
        registrationStatus: regMap.get(event._id.toString()) || null
      }));
    }

    res.json({
      events: eventsWithRegistration,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/events/:eventId
// @desc    Get single event details
// @access  Public
router.get('/:eventId', optionalAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('clubId', 'name logo description socialLinks')
      .populate('createdBy', 'name designation')
      .populate('approvedBy', 'name');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get reviews
    const reviews = await Review.find({ eventId, isVisible: true })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Check if user is registered
    let registrationStatus = null;
    let canReview = false;
    let alreadyReviewed = false;

    if (req.user) {
      const registration = await Registration.findOne({
        userId: req.user.userId,
        eventId
      });

      if (registration) {
        registrationStatus = {
          status: registration.status,
          paymentStatus: registration.paymentStatus,
          attended: registration.attended,
          ticketId: registration.ticketId
        };

        // Review window:
        // - eventEndDate exists → open after eventEndDate
        // - no eventEndDate → open after eventDate (event has started)
        const now = new Date();
        const reviewWindowOpensAt = event.eventEndDate || event.eventDate;
        const reviewWindowOpen = reviewWindowOpensAt <= now;

        if (registration.attended && reviewWindowOpen) {
          // Check if student already submitted a review
          const existingReview = await Review.findOne({
            userId: req.user.userId,
            eventId
          });
          if (existingReview) {
            alreadyReviewed = true;
            canReview = false;
          } else {
            canReview = true;
          }
        }
      }
    }

    res.json({
      event,
      reviews,
      registrationStatus,
      canReview,
      alreadyReviewed
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/events
// @desc    Create a new event (faculty only)
// @access  Faculty
router.post('/', [
  authenticate,
  authorize(['faculty', 'superadmin']),
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
  body('description').trim().isLength({ min: 20, max: 5000 }).withMessage('Description must be 20-5000 characters'),
  body('eventDate').isISO8601().withMessage('Valid event date required'),
  body('venue').trim().isLength({ min: 3, max: 100 }).withMessage('Venue must be 3-100 characters'),
  body('registrationStart').isISO8601().withMessage('Valid registration start date required'),
  body('registrationEnd').isISO8601().withMessage('Valid registration end date required'),
  body('isPaid').isBoolean({ loose: true }).withMessage('isPaid must be boolean'),
  body('eventEndDate').optional({ values: 'falsy' }).isISO8601().withMessage('Valid event end date required'),
  body('shortDescription').optional({ values: 'falsy' }).trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('maxCapacity').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('category').optional().isIn(['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Other']),
  handleValidationErrors
], async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      eventDate,
      eventEndDate,
      venue,
      registrationStart,
      registrationEnd,
      isPaid,
      price,
      maxCapacity,
      category,
      tags,
      bannerImage
    } = req.body;

    // Get faculty's club
    const faculty = await User.findById(req.user.userId);
    if (!faculty.clubId && req.user.role !== 'superadmin') {
      return res.status(400).json({ message: 'You are not assigned to any club' });
    }

    // Validate dates
    if (new Date(registrationEnd) <= new Date(registrationStart)) {
      return res.status(400).json({ message: 'Registration end must be after registration start' });
    }

    if (new Date(eventDate) <= new Date(registrationEnd)) {
      return res.status(400).json({ message: 'Event date must be after registration end' });
    }

    const event = new Event({
      title,
      description,
      shortDescription,
      clubId: faculty.clubId || req.body.clubId,
      createdBy: req.user.userId,
      status: 'pending_approval',
      eventDate,
      eventEndDate,
      venue,
      registrationStart,
      registrationEnd,
      isPaid: isPaid || false,
      price: isPaid ? price : 0,
      maxCapacity,
      category,
      tags,
      bannerImage
    });

    await event.save();

    await logAction(auditActions.EVENT_CREATED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetEvent: event._id,
      metadata: { title, clubId: faculty.clubId }
    });

    res.status(201).json({
      message: 'Event created successfully and pending approval',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/events/:eventId
// @desc    Update an event
// @access  Faculty (own events) or Superadmin
router.put('/:eventId', [
  authenticate,
  authorize(['faculty', 'superadmin']),
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions
    if (req.user.role === 'faculty') {
      const faculty = await User.findById(req.user.userId);
      if (event.clubId.toString() !== faculty.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to edit this event' });
      }

      // Can only edit if pending approval or rejected
      if (!['pending_approval', 'rejected'].includes(event.status)) {
        return res.status(400).json({ message: 'Cannot edit event after approval' });
      }
    }

    const updates = req.body;
    delete updates.status; // Don't allow status change through update
    delete updates.approvedBy;
    delete updates.approvedAt;

    Object.assign(event, updates);
    await event.save();

    await logAction(auditActions.EVENT_UPDATED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetEvent: event._id
    });

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/events/:eventId
// @desc    Cancel an event
// @access  Faculty or Superadmin
router.delete('/:eventId', [
  authenticate,
  authorize(['faculty', 'superadmin']),
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions
    if (req.user.role === 'faculty') {
      const faculty = await User.findById(req.user.userId);
      if (event.clubId.toString() !== faculty.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this event' });
      }
    }

    event.status = 'cancelled';
    await event.save();

    // Cancel all pending registrations
    await Registration.updateMany(
      { eventId, status: { $in: ['pending', 'confirmed'] } },
      { status: 'cancelled', cancelledAt: new Date() }
    );

    await logAction(auditActions.EVENT_CANCELLED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetEvent: event._id
    });

    res.json({ message: 'Event cancelled successfully' });
  } catch (error) {
    console.error('Cancel event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/events/:eventId/registrations
// @desc    Get event registrations (faculty only)
// @access  Faculty
router.get('/:eventId/registrations', [
  authenticate,
  authorize(['faculty', 'coordinator', 'superadmin']),
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, department, year, section, search, page = 1, limit = 50 } = req.query;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions
    if (req.user.role === 'faculty') {
      const faculty = await User.findById(req.user.userId);
      if (event.clubId.toString() !== faculty.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this event' });
      }
    }

    if (req.user.role === 'coordinator') {
      const coordinator = await User.findById(req.user.userId);
      if (event.clubId.toString() !== coordinator.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this event' });
      }
    }

    // Build query
    const query = { eventId };
    if (status) query.status = status;

    // Get registrations with user details
    let registrationsQuery = Registration.find(query)
      .populate({
        path: 'userId',
        select: 'name email rollNo department section currentYear',
        match: {}
      })
      .sort({ registeredAt: -1 });

    const registrations = await registrationsQuery;

    // Filter by user fields
    let filteredRegistrations = registrations.filter(r => r.userId);

    if (department) {
      filteredRegistrations = filteredRegistrations.filter(r =>
        r.userId.department === department
      );
    }

    if (year) {
      filteredRegistrations = filteredRegistrations.filter(r =>
        r.userId.currentYear === parseInt(year)
      );
    }

    if (section) {
      filteredRegistrations = filteredRegistrations.filter(r =>
        r.userId.section?.toLowerCase() === section.toLowerCase()
      );
    }

    if (search) {
      filteredRegistrations = filteredRegistrations.filter(r =>
        r.userId.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId.rollNo?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const total = filteredRegistrations.length;
    const paginated = filteredRegistrations.slice((page - 1) * limit, page * limit);

    res.json({
      registrations: paginated,
      event: {
        title: event.title,
        eventDate: event.eventDate,
        venue: event.venue,
        registeredCount: event.registeredCount,
        maxCapacity: event.maxCapacity
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
