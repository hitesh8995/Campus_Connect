const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  otpHash: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset', 'login'],
    default: 'email_verification'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  // For password reset
  resetToken: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
otpSchema.index({ userId: 1, type: 1 });
otpSchema.index({ email: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Method to verify OTP
otpSchema.methods.verifyOTP = async function(otp) {
  if (this.isUsed) {
    return { valid: false, message: 'OTP already used' };
  }
  
  if (this.expiresAt < new Date()) {
    return { valid: false, message: 'OTP expired' };
  }
  
  if (this.attempts >= this.maxAttempts) {
    return { valid: false, message: 'Maximum attempts exceeded' };
  }
  
  this.attempts += 1;
  await this.save();
  
  const isValid = await bcrypt.compare(otp, this.otpHash);
  
  if (!isValid) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // Mark as used
  this.isUsed = true;
  this.usedAt = new Date();
  await this.save();
  
  return { valid: true, message: 'OTP verified successfully' };
};

// Static method to create OTP
otpSchema.statics.createOTP = async function(userId, email, type = 'email_verification') {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP
  const otpHash = await bcrypt.hash(otp, 10);
  
  // Delete any existing OTPs for this user and type
  await this.deleteMany({ userId, type });
  
  // Create new OTP
  const otpDoc = await this.create({
    userId,
    email,
    otpHash,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    attempts: 0
  });
  
  return { otpDoc, plainOTP: otp };
};

module.exports = mongoose.model('OTP', otpSchema);
