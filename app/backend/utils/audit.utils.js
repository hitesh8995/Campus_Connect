const { AuditLog } = require('../models');

// Log action
const logAction = async (action, performedBy, details = {}) => {
  try {
    const logEntry = new AuditLog({
      action,
      performedBy: performedBy.userId,
      performedByRole: performedBy.role,
      targetUser: details.targetUser,
      targetEvent: details.targetEvent,
      targetClub: details.targetClub,
      details: details.metadata || {},
      ipAddress: details.ipAddress,
      userAgent: details.userAgent
    });

    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - logging should not break functionality
  }
};

// Common audit actions
const auditActions = {
  // User actions
  USER_REGISTERED: 'USER_REGISTERED',
  USER_APPROVED: 'USER_APPROVED',
  USER_REJECTED: 'USER_REJECTED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',

  // Event actions
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_APPROVED: 'EVENT_APPROVED',
  EVENT_REJECTED: 'EVENT_REJECTED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  EVENT_COMPLETED: 'EVENT_COMPLETED',

  // Registration actions
  REGISTRATION_CREATED: 'REGISTRATION_CREATED',
  REGISTRATION_CONFIRMED: 'REGISTRATION_CONFIRMED',
  REGISTRATION_CANCELLED: 'REGISTRATION_CANCELLED',

  // Payment actions
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',

  // Attendance actions
  ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',

  // Review actions
  REVIEW_CREATED: 'REVIEW_CREATED',
  REVIEW_MODERATED: 'REVIEW_MODERATED',

  // Club actions
  CLUB_CREATED: 'CLUB_CREATED',
  CLUB_UPDATED: 'CLUB_UPDATED',
  COORDINATOR_ASSIGNED: 'COORDINATOR_ASSIGNED',
  COORDINATOR_REMOVED: 'COORDINATOR_REMOVED',

  // Settings
  SETTINGS_UPDATED: 'SETTINGS_UPDATED'
};

module.exports = {
  logAction,
  auditActions
};
