const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000,
    trim: true
  },
  logo: {
    type: String, // URL to logo image
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  coordinators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Club status
  isActive: {
    type: Boolean,
    default: true
  },
  // Social links
  socialLinks: {
    website: String,
    instagram: String,
    linkedin: String,
    twitter: String
  },
  // Statistics
  totalEvents: {
    type: Number,
    default: 0
  },
  totalMembers: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
clubSchema.index({ name: 1 }, { unique: true });
clubSchema.index({ assignedFaculty: 1 });
clubSchema.index({ isActive: 1 });

module.exports = mongoose.model('Club', clubSchema);
