const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const QRCode = require('qrcode');
const { Payment, Registration, Event } = require('../models');
const { verifyPaymentSignature, verifyWebhookSignature, fetchPayment } = require('../utils/razorpay.utils');
const { logAction, auditActions } = require('../utils/audit.utils');
const { authenticate } = require('../middleware/auth.middleware');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   POST /api/payments/verify
// @desc    Verify payment and confirm registration (client callback)
// @access  Student
router.post('/verify', [
  authenticate,
  body('razorpay_order_id').notEmpty().withMessage('Order ID required'),
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID required'),
  body('razorpay_signature').notEmpty().withMessage('Signature required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Verify signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    
    // Find registration
    const registration = await Registration.findOne({ razorpayOrderId: razorpay_order_id });
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Check if already processed
    if (registration.paymentStatus === 'paid') {
      return res.json({ message: 'Payment already processed', registration });
    }
    
    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPayment(razorpay_payment_id);
    
    // Create payment record
    const payment = new Payment({
      registrationId: registration._id,
      userId: registration.userId,
      eventId: registration.eventId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: paymentDetails.amount / 100, // Convert from paise
      currency: paymentDetails.currency,
      status: paymentDetails.status === 'captured' ? 'captured' : 'authorized',
      method: paymentDetails.method,
      notes: paymentDetails.notes
    });
    
    await payment.save();
    
    // Confirm registration
    await registration.confirm(razorpay_payment_id);
    registration.amountPaid = payment.amount;
    
    // Increment event registered count
    await Event.incrementRegisteredCount(registration.eventId);
    
    // Generate QR code
    const qrData = {
      ticketId: registration.ticketId,
      registrationId: registration._id.toString(),
      eventId: registration.eventId.toString()
    };
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
    registration.qrCode = qrCode;
    
    await registration.save();
    
    await logAction(auditActions.PAYMENT_SUCCESS, {
      userId: req.user.userId,
      role: 'student'
    }, {
      targetEvent: registration.eventId,
      metadata: { 
        registrationId: registration._id,
        paymentId: payment._id,
        amount: payment.amount
      }
    });
    
    res.json({
      message: 'Payment verified and registration confirmed',
      registration: {
        id: registration._id,
        ticketId: registration.ticketId,
        status: registration.status,
        qrCode: registration.qrCode
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/payments/webhook/razorpay
// @desc    Razorpay webhook handler
// @access  Public (webhook)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;
    
    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }
    
    const event = JSON.parse(body);
    
    console.log('Razorpay webhook received:', event.event);
    
    // Handle different events
    switch (event.event) {
      case 'payment.captured':
      case 'payment.authorized':
        await handlePaymentSuccess(event.payload.payment.entity);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
        
      case 'refund.processed':
        await handleRefund(event.payload.refund.entity);
        break;
        
      default:
        console.log('Unhandled webhook event:', event.event);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing error' });
  }
});

// Handle successful payment
async function handlePaymentSuccess(paymentEntity) {
  const { order_id, id, amount, status } = paymentEntity;
  
  try {
    // Find registration
    const registration = await Registration.findOne({ razorpayOrderId: order_id });
    if (!registration) {
      console.error('Registration not found for order:', order_id);
      return;
    }
    
    // Check if already processed
    if (registration.paymentStatus === 'paid') {
      console.log('Payment already processed for order:', order_id);
      return;
    }
    
    // Check for existing payment record
    let payment = await Payment.findOne({ razorpayOrderId: order_id });
    
    if (!payment) {
      payment = new Payment({
        registrationId: registration._id,
        userId: registration.userId,
        eventId: registration.eventId,
        razorpayOrderId: order_id,
        razorpayPaymentId: id,
        amount: amount / 100,
        currency: 'INR',
        status: status === 'captured' ? 'captured' : 'authorized',
        webhookProcessed: true,
        lastWebhookAt: new Date()
      });
    } else {
      payment.status = status === 'captured' ? 'captured' : 'authorized';
      payment.webhookProcessed = true;
      payment.lastWebhookAt = new Date();
    }
    
    await payment.save();
    
    // Confirm registration
    await registration.confirm(id);
    registration.amountPaid = payment.amount;
    
    // Increment event registered count
    await Event.incrementRegisteredCount(registration.eventId);
    
    // Generate QR code
    const qrData = {
      ticketId: registration.ticketId,
      registrationId: registration._id.toString(),
      eventId: registration.eventId.toString()
    };
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
    registration.qrCode = qrCode;
    
    await registration.save();
    
    await logAction(auditActions.PAYMENT_SUCCESS, {
      userId: registration.userId,
      role: 'student'
    }, {
      targetEvent: registration.eventId,
      metadata: { 
        registrationId: registration._id,
        paymentId: payment._id,
        amount: payment.amount
      }
    });
    
    console.log('Payment processed successfully for order:', order_id);
  } catch (error) {
    console.error('Error processing payment success:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(paymentEntity) {
  const { order_id, id, error_description } = paymentEntity;
  
  try {
    const registration = await Registration.findOne({ razorpayOrderId: order_id });
    if (!registration) {
      console.error('Registration not found for failed order:', order_id);
      return;
    }
    
    registration.paymentStatus = 'failed';
    await registration.save();
    
    // Create/update payment record
    let payment = await Payment.findOne({ razorpayOrderId: order_id });
    
    if (!payment) {
      payment = new Payment({
        registrationId: registration._id,
        userId: registration.userId,
        eventId: registration.eventId,
        razorpayOrderId: order_id,
        razorpayPaymentId: id,
        status: 'failed',
        errorMessage: error_description,
        webhookProcessed: true,
        lastWebhookAt: new Date()
      });
    } else {
      payment.status = 'failed';
      payment.errorMessage = error_description;
      payment.webhookProcessed = true;
      payment.lastWebhookAt = new Date();
    }
    
    await payment.save();
    
    await logAction(auditActions.PAYMENT_FAILED, {
      userId: registration.userId,
      role: 'student'
    }, {
      targetEvent: registration.eventId,
      metadata: { 
        registrationId: registration._id,
        error: error_description
      }
    });
    
    console.log('Payment failure recorded for order:', order_id);
  } catch (error) {
    console.error('Error processing payment failure:', error);
  }
}

// Handle refund
async function handleRefund(refundEntity) {
  const { payment_id, amount, status } = refundEntity;
  
  try {
    const payment = await Payment.findOne({ razorpayPaymentId: payment_id });
    if (!payment) {
      console.error('Payment not found for refund:', payment_id);
      return;
    }
    
    payment.status = status === 'processed' ? 'refunded' : payment.status;
    payment.refundAmount = amount / 100;
    await payment.save();
    
    // Update registration
    const registration = await Registration.findById(payment.registrationId);
    if (registration) {
      registration.paymentStatus = 'refunded';
      await registration.save();
    }
    
    await logAction(auditActions.PAYMENT_REFUNDED, {
      userId: payment.userId,
      role: 'system'
    }, {
      targetEvent: payment.eventId,
      metadata: { 
        paymentId: payment._id,
        refundAmount: payment.refundAmount
      }
    });
    
    console.log('Refund processed for payment:', payment_id);
  } catch (error) {
    console.error('Error processing refund:', error);
  }
}

// @route   GET /api/payments/my-payments
// @desc    Get my payment history
// @access  Student
router.get('/my-payments', authenticate, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.userId })
      .populate({
        path: 'eventId',
        select: 'title eventDate'
      })
      .sort({ createdAt: -1 });
    
    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
