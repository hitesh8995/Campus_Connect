const express = require('express');
const router = express.Router();
const { Club, Event } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

// @route   GET /api/clubs
// @desc    Get all clubs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const clubs = await Club.find({ isActive: true })
      .populate('assignedFaculty', 'name designation')
      .populate('coordinators', 'name')
      .sort({ name: 1 });

    // Compute live event counts per club from the Event collection
    const clubIds = clubs.map(c => c._id);
    const eventCounts = await Event.aggregate([
      {
        $match: {
          clubId: { $in: clubIds },
          status: 'approved',
          isPublished: true
        }
      },
      {
        $group: {
          _id: '$clubId',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = {};
    eventCounts.forEach(e => { countMap[e._id.toString()] = e.count; });

    const clubsWithCount = clubs.map(club => {
      const obj = club.toObject();
      obj.totalEvents = countMap[club._id.toString()] || 0;
      return obj;
    });

    res.json({ clubs: clubsWithCount });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/clubs/:clubId
// @desc    Get single club details
// @access  Public
router.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId)
      .populate('assignedFaculty', 'name designation department email')
      .populate('coordinators', 'name rollNo department');

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Get upcoming events
    const upcomingEvents = await Event.find({
      clubId,
      status: 'approved',
      isPublished: true,
      eventDate: { $gte: new Date() }
    })
      .select('title description eventDate venue bannerImage registeredCount maxCapacity')
      .sort({ eventDate: 1 })
      .limit(5);

    // Get past events
    const pastEvents = await Event.find({
      clubId,
      status: { $in: ['approved', 'completed'] },
      isPublished: true,
      eventDate: { $lt: new Date() }
    })
      .select('title description eventDate venue bannerImage averageRating totalReviews')
      .sort({ eventDate: -1 })
      .limit(5);

    res.json({
      club,
      upcomingEvents,
      pastEvents
    });
  } catch (error) {
    console.error('Get club error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/clubs/:clubId/events
// @desc    Get all events for a club
// @access  Public
router.get('/:clubId/events', async (req, res) => {
  try {
    const { clubId } = req.params;
    const { status = 'approved', page = 1, limit = 12 } = req.query;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    const query = {
      clubId,
      isPublished: true
    };

    if (status) query.status = status;

    const events = await Event.find(query)
      .populate('clubId', 'name')
      .sort({ eventDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get club events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
