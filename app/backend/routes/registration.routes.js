const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const QRCode = require('qrcode');
const { Registration, Event, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { createOrder, generateTicketQRData } = require('../utils/razorpay.utils');
const { logAction, auditActions } = require('../utils/audit.utils');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   POST /api/registrations/events/:eventId/register
// @desc    Register for an event
// @access  Student
router.post('/events/:eventId/register', [
  authenticate,
  authorize(['student']),
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    
    // Check if user is approved
    const user = await User.findById(userId);
    if (user.approvalStatus !== 'approved') {
      return res.status(403).json({ message: 'Account pending approval' });
    }
    
    // Get event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if event can be registered
    if (!event.canRegister()) {
      return res.status(400).json({ message: 'Registration is not open for this event' });
    }
    
    // Check for existing registration
    const existingRegistration = await Registration.findOne({ userId, eventId });
    if (existingRegistration) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }
    
    // For paid events, create Razorpay order
    let razorpayOrder = null;
    if (event.isPaid && event.price > 0) {
      try {
        razorpayOrder = await createOrder(
          event.price,
          'INR',
          `reg_${Date.now()}`,
          { eventId: eventId.toString(), userId: userId.toString() }
        );
      } catch (error) {
        console.error('Razorpay order creation error:', error);
        return res.status(500).json({ message: 'Payment service unavailable' });
      }
    }
    
    // Create registration
    const registration = new Registration({
      userId,
      eventId,
      status: event.isPaid ? 'pending' : 'confirmed',
      paymentStatus: event.isPaid ? 'pending' : 'free',
      razorpayOrderId: razorpayOrder?.id || null,
      amountPaid: event.isPaid ? 0 : 0,
      expiresAt: event.isPaid ? new Date(Date.now() + 30 * 60 * 1000) : null, // 30 min expiry for paid
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    await registration.save();
    
    // Increment event registered count for free events
    if (!event.isPaid) {
      await Event.incrementRegisteredCount(eventId);
      registration.confirmedAt = new Date();
      await registration.save();
      
      // Generate QR code
      const qrData = generateTicketQRData(registration.ticketId, registration._id, eventId);
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      registration.qrCode = qrCode;
      await registration.save();
    }
    
    await logAction(auditActions.REGISTRATION_CREATED, {
      userId,
      role: 'student'
    }, {
      targetEvent: eventId,
      metadata: { registrationId: registration._id, isPaid: event.isPaid }
    });
    
    res.status(201).json({
      message: event.isPaid ? 'Please complete payment to confirm registration' : 'Registration successful',
      registration: {
        id: registration._id,
        ticketId: registration.ticketId,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        qrCode: registration.qrCode
      },
      ...(razorpayOrder && {
        payment: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.RZP_KEY_ID
        }
      })
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/registrations/my-registrations
// @desc    Get my registrations
// @access  Student
router.get('/my-registrations', authenticate, authorize(['student']), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.user.userId };
    if (status) query.status = status;
    
    const registrations = await Registration.find(query)
      .populate({
        path: 'eventId',
        select: 'title description eventDate venue bannerImage status',
        populate: {
          path: 'clubId',
          select: 'name'
        }
      })
      .sort({ registeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Registration.countDocuments(query);
    
    res.json({
      registrations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/registrations/:registrationId/ticket
// @desc    Get ticket details
// @access  Student (own tickets)
router.get('/:registrationId/ticket', [
  authenticate,
  param('registrationId').isMongoId().withMessage('Valid registration ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    const registration = await Registration.findById(registrationId)
      .populate({
        path: 'eventId',
        select: 'title description eventDate eventEndDate venue clubId',
        populate: {
          path: 'clubId',
          select: 'name'
        }
      })
      .populate('userId', 'name rollNo department');
    
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Check ownership
    if (registration.userId._id.toString() !== req.user.userId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }
    
    if (registration.status !== 'confirmed') {
      return res.status(400).json({ message: 'Registration not confirmed yet' });
    }
    
    res.json({
      ticket: {
        ticketId: registration.ticketId,
        qrCode: registration.qrCode,
        event: registration.eventId,
        attendee: registration.userId,
        registeredAt: registration.registeredAt,
        attended: registration.attended
      }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/registrations/:registrationId
// @desc    Cancel registration
// @access  Student (own registrations)
router.delete('/:registrationId', [
  authenticate,
  param('registrationId').isMongoId().withMessage('Valid registration ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Check ownership
    if (registration.userId.toString() !== req.user.userId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to cancel this registration' });
    }
    
    // Check if can be cancelled
    if (!['pending', 'confirmed'].includes(registration.status)) {
      return res.status(400).json({ message: 'Registration cannot be cancelled' });
    }
    
    const event = await Event.findById(registration.eventId);
    
    // Don't allow cancellation if event has started
    if (event.eventDate < new Date()) {
      return res.status(400).json({ message: 'Cannot cancel after event has started' });
    }
    
    // If paid and confirmed, need to process refund
    if (registration.paymentStatus === 'paid') {
      // TODO: Process refund through Razorpay
      registration.paymentStatus = 'refunded';
    }
    
    registration.status = 'cancelled';
    registration.cancelledAt = new Date();
    await registration.save();
    
    // Decrement event registered count
    await Event.decrementRegisteredCount(registration.eventId);
    
    await logAction(auditActions.REGISTRATION_CANCELLED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetEvent: registration.eventId,
      metadata: { registrationId }
    });
    
    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
