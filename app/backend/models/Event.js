const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 5000,
    trim: true
  },
  shortDescription: {
    type: String,
    maxlength: 200,
    trim: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending_approval'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  // Event timing
  eventDate: {
    type: Date,
    required: true
  },
  eventEndDate: {
    type: Date
  },
  venue: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100,
    trim: true
  },
  registrationStart: {
    type: Date,
    required: true
  },
  registrationEnd: {
    type: Date,
    required: true
  },
  // Payment details
  isPaid: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  // Capacity
  maxCapacity: {
    type: Number,
    default: null, // null means unlimited
    min: 1
  },
  registeredCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Event media
  bannerImage: {
    type: String,
    default: null
  },
  gallery: [{
    type: String
  }],
  // Categories/Tags
  category: {
    type: String,
    enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Other'],
    default: 'Other'
  },
  tags: [{
    type: String,
    maxlength: 30
  }],
  // Ratings and reviews
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  // Rejection reason
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  // Approval details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  // Attendance tracking
  attendanceEnabled: {
    type: Boolean,
    default: true
  },
  attendanceStartTime: {
    type: Date
  },
  attendanceEndTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ clubId: 1, eventDate: -1 });
eventSchema.index({ status: 1 });
eventSchema.index({ isPublished: 1 });
eventSchema.index({ eventDate: 1 });
eventSchema.index({ registrationStart: 1, registrationEnd: 1 });
eventSchema.index({ category: 1 });

// Virtual for checking if registration is open
eventSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  return now >= this.registrationStart && now <= this.registrationEnd && 
         this.status === 'approved' && this.isPublished;
});

// Virtual for checking if event is full
eventSchema.virtual('isFull').get(function() {
  if (!this.maxCapacity) return false;
  return this.registeredCount >= this.maxCapacity;
});

// Method to check if user can register
eventSchema.methods.canRegister = function() {
  const now = new Date();
  return (
    this.status === 'approved' &&
    this.isPublished &&
    now >= this.registrationStart &&
    now <= this.registrationEnd &&
    (!this.maxCapacity || this.registeredCount < this.maxCapacity)
  );
};

// Method to increment registered count atomically
eventSchema.statics.incrementRegisteredCount = async function(eventId) {
  return this.findOneAndUpdate(
    { 
      _id: eventId, 
      $or: [
        { maxCapacity: null },
        { $expr: { $lt: ['$registeredCount', '$maxCapacity'] } }
      ]
    },
    { $inc: { registeredCount: 1 } },
    { new: true }
  );
};

// Method to decrement registered count
eventSchema.statics.decrementRegisteredCount = async function(eventId) {
  return this.findOneAndUpdate(
    { _id: eventId, registeredCount: { $gt: 0 } },
    { $inc: { registeredCount: -1 } },
    { new: true }
  );
};

// Update average rating
eventSchema.methods.updateAverageRating = async function() {
  const Review = mongoose.model('Review');
  const result = await Review.aggregate([
    { $match: { eventId: this._id } },
    { 
      $group: { 
        _id: null, 
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      } 
    }
  ]);
  
  if (result.length > 0) {
    this.averageRating = Math.round(result[0].avgRating * 10) / 10;
    this.totalReviews = result[0].count;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }
  
  return this.save();
};

module.exports = mongoose.model('Event', eventSchema);
