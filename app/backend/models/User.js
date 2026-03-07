const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['superadmin', 'faculty', 'coordinator', 'student'],
    default: 'student'
  },
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    minlength: 10,
    maxlength: 100,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Student-specific fields
  rollNo: {
    type: String,
    minlength: 10,
    maxlength: 10,
    sparse: true,
    trim: true,
    match: [/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10}$/, 'Roll number must be 10 alphanumeric characters']
  },
  department: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'CSBS', 'OTHER']
  },
  section: {
    type: String,
    minlength: 1,
    maxlength: 5,
    trim: true
  },
  yearOfAdmission: {
    type: Number,
    min: 2000,
    max: 2030
  },
  currentYear: {
    type: Number,
    min: 1,
    max: 6
  },
  // Faculty-specific fields
  facultyId: {
    type: String,
    minlength: 4,
    maxlength: 20,
    sparse: true,
    trim: true
  },
  designation: {
    type: String,
    enum: ['Assistant Professor', 'Associate Professor', 'HOD', 'Director', 'Principal', 'Lecturer']
  },
  // Club association
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    default: null
  },
  // For coordinators - assigned events
  assignedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ rollNo: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ approvalStatus: 1 });
userSchema.index({ clubId: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Static method to hash password
userSchema.statics.hashPassword = async function(password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model('User', userSchema);
