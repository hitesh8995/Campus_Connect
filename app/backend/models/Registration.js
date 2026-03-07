const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'free', 'failed', 'refunded'],
    default: 'pending'
  },
  // Razorpay details
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  // Ticket details
  ticketId: {
    type: String,
    unique: true,
    sparse: true
  },
  qrCode: {
    type: String // Base64 QR code image
  },
  // Registration timing
  registeredAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  // Attendance
  attended: {
    type: Boolean,
    default: false
  },
  attendedAt: {
    type: Date
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Amount paid
  amountPaid: {
    type: Number,
    default: 0
  },
  // Expiry for pending registrations (for paid events)
  expiresAt: {
    type: Date
  },
  // Metadata
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate registrations
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
registrationSchema.index({ eventId: 1, status: 1 });
registrationSchema.index({ ticketId: 1 });
registrationSchema.index({ razorpayOrderId: 1 });
registrationSchema.index({ razorpayPaymentId: 1 });
registrationSchema.index({ status: 1, paymentStatus: 1 });

// Generate ticket ID
registrationSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.ticketId = `TCK-${timestamp}-${random}`;
  }
  next();
});

// Method to confirm registration
registrationSchema.methods.confirm = async function(paymentId = null) {
  this.status = 'confirmed';
  this.paymentStatus = this.paymentStatus === 'free' ? 'free' : 'paid';
  this.confirmedAt = new Date();
  if (paymentId) {
    this.razorpayPaymentId = paymentId;
  }
  return this.save();
};

// Method to mark attendance
registrationSchema.methods.markAttendance = async function(markedByUserId) {
  this.attended = true;
  this.attendedAt = new Date();
  this.markedBy = markedByUserId;
  return this.save();
};

// Method to cancel registration
registrationSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Registration', registrationSchema);
