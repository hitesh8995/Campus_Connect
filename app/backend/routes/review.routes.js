const express = require('express');
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const { Review, Event, Registration } = require('../models');
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

// @route   POST /api/reviews/events/:eventId
// @desc    Create a review for an event
// @access  Student
router.post('/events/:eventId', [
  authenticate,
  authorize(['student']),
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    // Get event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Determine the review window:
    // - If eventEndDate exists → reviews open only after eventEndDate
    // - Otherwise → reviews open after eventDate (event has started)
    const now = new Date();
    const reviewWindowOpensAt = event.eventEndDate || event.eventDate;
    if (reviewWindowOpensAt > now) {
      const msg = event.eventEndDate
        ? 'Reviews can only be submitted after the event has ended'
        : 'Reviews can only be submitted after the event has started';
      return res.status(400).json({ message: msg });
    }

    // Check if user registered and attended
    const registration = await Registration.findOne({
      userId,
      eventId,
      status: 'confirmed',
      attended: true
    });

    if (!registration) {
      return res.status(403).json({
        message: 'You must have attended the event to submit a review'
      });
    }

    // Check for existing review
    const existingReview = await Review.findOne({ userId, eventId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this event' });
    }

    // Create review
    const review = new Review({
      userId,
      eventId,
      registrationId: registration._id,
      rating,
      comment,
      isVisible: true
    });

    await review.save();

    // Update event average rating
    await event.updateAverageRating();

    await logAction(auditActions.REVIEW_CREATED, {
      userId,
      role: 'student'
    }, {
      targetEvent: eventId,
      metadata: { rating, reviewId: review._id }
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reviews/events/:eventId
// @desc    Get reviews for an event (rating + comment visible to everyone)
// @access  Public
router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ eventId, isVisible: true })
      .populate('userId', 'name department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ eventId, isVisible: true });

    // Get rating distribution
    const ratingStats = await Review.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId), isVisible: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingStats.forEach(stat => {
      distribution[stat._id] = stat.count;
    });

    res.json({
      reviews,
      ratingDistribution: distribution,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reviews/my-reviews
// @desc    Get my reviews
// @access  Student
router.get('/my-reviews', authenticate, authorize(['student']), async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.userId })
      .populate({
        path: 'eventId',
        select: 'title eventDate bannerImage'
      })
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete my review
// @access  Student
router.delete('/:reviewId', [
  authenticate,
  param('reviewId').isMongoId().withMessage('Valid review ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check ownership
    if (review.userId.toString() !== req.user.userId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();

    // Update event average rating
    const event = await Event.findById(review.eventId);
    if (event) {
      await event.updateAverageRating();
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/reviews/:reviewId/moderate
// @desc    Moderate a review (hide/show)
// @access  Superadmin
router.patch('/:reviewId/moderate', [
  authenticate,
  authorize(['superadmin']),
  param('reviewId').isMongoId().withMessage('Valid review ID required'),
  body('isVisible').isBoolean().withMessage('isVisible must be boolean'),
  body('reason').optional().trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isVisible, reason } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isVisible = isVisible;
    review.isFlagged = !isVisible;
    review.flagReason = reason;
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    // Update event average rating
    const event = await Event.findById(review.eventId);
    if (event) {
      await event.updateAverageRating();
    }

    await logAction(auditActions.REVIEW_MODERATED, {
      userId: req.user.userId,
      role: 'superadmin'
    }, {
      targetEvent: review.eventId,
      metadata: { reviewId, isVisible, reason }
    });

    res.json({
      message: `Review ${isVisible ? 'approved' : 'hidden'} successfully`,
      review
    });
  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
