const express = require('express');
const { param, body, query, validationResult } = require('express-validator');
const router = express.Router();
const { Registration, Event, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { logAction, auditActions } = require('../utils/audit.utils');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// All routes require coordinator or faculty/superadmin access
router.use(authenticate);
router.use(authorize(['coordinator', 'faculty', 'superadmin']));

// @route   GET /api/coordinator/events
// @desc    Get events assigned to coordinator
// @access  Coordinator/Faculty
router.get('/events', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Filter by club for coordinators
    if (req.user.role === 'coordinator') {
      const coordinator = await User.findById(req.user.userId);
      query.clubId = coordinator.clubId;
    } else if (req.user.role === 'faculty') {
      const faculty = await User.findById(req.user.userId);
      query.clubId = faculty.clubId;
    }
    
    if (status) query.status = status;
    
    const events = await Event.find(query)
      .populate('clubId', 'name')
      .sort({ eventDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(query);
    
    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get coordinator events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/coordinator/events/:eventId/registrations
// @desc    Get registrations for an event with filters
// @access  Coordinator/Faculty
router.get('/events/:eventId/registrations', [
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const { 
      status, 
      department, 
      year, 
      section, 
      attended,
      search,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Verify event access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (req.user.role === 'coordinator' || req.user.role === 'faculty') {
      const user = await User.findById(req.user.userId);
      if (event.clubId.toString() !== user.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this event' });
      }
    }
    
    // Build query
    const query = { eventId };
    if (status) query.status = status;
    if (attended !== undefined) query.attended = attended === 'true';
    
    // Get registrations
    let registrations = await Registration.find(query)
      .populate({
        path: 'userId',
        select: 'name email rollNo department section currentYear'
      })
      .sort({ registeredAt: -1 });
    
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
      const searchLower = search.toLowerCase();
      filteredRegistrations = filteredRegistrations.filter(r => 
        r.userId.name?.toLowerCase().includes(searchLower) ||
        r.userId.rollNo?.toLowerCase().includes(searchLower) ||
        r.userId.email?.toLowerCase().includes(searchLower)
      );
    }
    
    // Calculate stats
    const stats = {
      total: filteredRegistrations.length,
      confirmed: filteredRegistrations.filter(r => r.status === 'confirmed').length,
      pending: filteredRegistrations.filter(r => r.status === 'pending').length,
      attended: filteredRegistrations.filter(r => r.attended).length,
      notAttended: filteredRegistrations.filter(r => !r.attended && r.status === 'confirmed').length
    };
    
    // Pagination
    const total = filteredRegistrations.length;
    const paginated = filteredRegistrations.slice((page - 1) * limit, page * limit);
    
    res.json({
      registrations: paginated,
      stats,
      event: {
        id: event._id,
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
    console.error('Get event registrations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/coordinator/registrations/:registrationId/attendance
// @desc    Mark attendance for a registration
// @access  Coordinator/Faculty
router.post('/registrations/:registrationId/attendance', [
  param('registrationId').isMongoId().withMessage('Valid registration ID required'),
  body('attended').isBoolean().withMessage('Attended must be boolean'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { attended } = req.body;
    
    const registration = await Registration.findById(registrationId)
      .populate('eventId');
    
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Verify access
    if (req.user.role === 'coordinator' || req.user.role === 'faculty') {
      const user = await User.findById(req.user.userId);
      if (registration.eventId.clubId.toString() !== user.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to mark attendance for this event' });
      }
    }
    
    // Check if event is ongoing or past
    const now = new Date();
    const eventDate = new Date(registration.eventId.eventDate);
    
    // Allow attendance marking on event day (with 1 hour buffer before and after)
    const bufferMs = 60 * 60 * 1000; // 1 hour
    const attendanceStart = new Date(eventDate.getTime() - bufferMs);
    const attendanceEnd = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours after
    
    if (now < attendanceStart) {
      return res.status(400).json({ 
        message: 'Attendance marking not started yet',
        startsAt: attendanceStart
      });
    }
    
    if (now > attendanceEnd) {
      return res.status(400).json({ 
        message: 'Attendance marking period has ended',
        endedAt: attendanceEnd
      });
    }
    
    // Update attendance
    registration.attended = attended;
    if (attended) {
      registration.attendedAt = new Date();
      registration.markedBy = req.user.userId;
    } else {
      registration.attendedAt = null;
      registration.markedBy = null;
    }
    
    await registration.save();
    
    await logAction(auditActions.ATTENDANCE_MARKED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetEvent: registration.eventId._id,
      targetUser: registration.userId,
      metadata: { 
        registrationId,
        attended,
        ticketId: registration.ticketId
      }
    });
    
    res.json({
      message: `Attendance ${attended ? 'marked' : 'unmarked'} successfully`,
      registration: {
        id: registration._id,
        ticketId: registration.ticketId,
        attended: registration.attended,
        attendedAt: registration.attendedAt
      }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/coordinator/verify-ticket
// @desc    Verify ticket by ticket ID
// @access  Coordinator/Faculty
router.post('/verify-ticket', [
  body('ticketId').notEmpty().withMessage('Ticket ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { ticketId } = req.body;
    
    const registration = await Registration.findOne({ ticketId })
      .populate({
        path: 'eventId',
        select: 'title eventDate venue clubId'
      })
      .populate({
        path: 'userId',
        select: 'name email rollNo department section currentYear'
      });
    
    if (!registration) {
      return res.status(404).json({ message: 'Invalid ticket' });
    }
    
    // Verify access
    if (req.user.role === 'coordinator' || req.user.role === 'faculty') {
      const user = await User.findById(req.user.userId);
      if (registration.eventId.clubId.toString() !== user.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to verify this ticket' });
      }
    }
    
    res.json({
      valid: registration.status === 'confirmed',
      registration: {
        ticketId: registration.ticketId,
        status: registration.status,
        attended: registration.attended,
        event: registration.eventId,
        attendee: registration.userId
      }
    });
  } catch (error) {
    console.error('Verify ticket error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/coordinator/export-registrations/:eventId
// @desc    Export registrations as CSV
// @access  Coordinator/Faculty
router.get('/export-registrations/:eventId', [
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const { department, year, section } = req.query;
    
    // Verify event access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (req.user.role === 'coordinator' || req.user.role === 'faculty') {
      const user = await User.findById(req.user.userId);
      if (event.clubId.toString() !== user.clubId?.toString()) {
        return res.status(403).json({ message: 'Not authorized to export this event' });
      }
    }
    
    // Get registrations
    let registrations = await Registration.find({ 
      eventId, 
      status: { $in: ['confirmed', 'pending'] } 
    })
      .populate({
        path: 'userId',
        select: 'name email rollNo department section currentYear'
      })
      .sort({ registeredAt: -1 });
    
    // Filter
    let filtered = registrations.filter(r => r.userId);
    
    if (department) {
      filtered = filtered.filter(r => r.userId.department === department);
    }
    if (year) {
      filtered = filtered.filter(r => r.userId.currentYear === parseInt(year));
    }
    if (section) {
      filtered = filtered.filter(r => r.userId.section?.toLowerCase() === section.toLowerCase());
    }
    
    // Generate CSV
    const headers = ['Name', 'Email', 'Roll No', 'Department', 'Section', 'Year', 'Ticket ID', 'Status', 'Attended', 'Registered At'];
    const rows = filtered.map(r => [
      r.userId.name,
      r.userId.email,
      r.userId.rollNo,
      r.userId.department,
      r.userId.section,
      r.userId.currentYear,
      r.ticketId,
      r.status,
      r.attended ? 'Yes' : 'No',
      r.registeredAt.toISOString()
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(field => `"${field}"`).join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${event.title}-registrations.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export registrations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
