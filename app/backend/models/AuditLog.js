const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_REGISTERED',
      'USER_APPROVED',
      'USER_REJECTED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_UPDATED',
      'USER_DELETED',
      'EVENT_CREATED',
      'EVENT_APPROVED',
      'EVENT_REJECTED',
      'EVENT_UPDATED',
      'EVENT_CANCELLED',
      'EVENT_COMPLETED',
      'REGISTRATION_CREATED',
      'REGISTRATION_CONFIRMED',
      'REGISTRATION_CANCELLED',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'PAYMENT_REFUNDED',
      'ATTENDANCE_MARKED',
      'REVIEW_CREATED',
      'REVIEW_MODERATED',
      'CLUB_CREATED',
      'CLUB_UPDATED',
      'COORDINATOR_ASSIGNED',
      'SETTINGS_UPDATED'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByRole: {
    type: String,
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  targetClub: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ targetEvent: 1 });
auditLogSchema.index({ targetUser: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
