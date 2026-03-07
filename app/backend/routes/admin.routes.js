const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const { User, Club, Event, Registration, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { sendApprovalEmail } = require('../utils/email.service');
const { logAction, auditActions } = require('../utils/audit.utils');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array()));
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// All routes require superadmin access
router.use(authenticate);
router.use(authorize(['superadmin']));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Superadmin
router.get('/dashboard', async (req, res) => {
  try {
    const stats = {
      users: {
        total: await User.countDocuments(),
        students: await User.countDocuments({ role: 'student' }),
        faculty: await User.countDocuments({ role: 'faculty' }),
        coordinators: await User.countDocuments({ role: 'coordinator' }),
        pendingApproval: await User.countDocuments({ approvalStatus: 'pending' })
      },
      clubs: {
        total: await Club.countDocuments(),
        active: await Club.countDocuments({ isActive: true })
      },
      events: {
        total: await Event.countDocuments(),
        pending: await Event.countDocuments({ status: 'pending_approval' }),
        approved: await Event.countDocuments({ status: 'approved' }),
        completed: await Event.countDocuments({ status: 'completed' }),
        cancelled: await Event.countDocuments({ status: 'cancelled' })
      },
      registrations: {
        total: await Registration.countDocuments(),
        confirmed: await Registration.countDocuments({ status: 'confirmed' }),
        pending: await Registration.countDocuments({ status: 'pending' })
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/pending-users
// @desc    Get pending user approvals
// @access  Superadmin
router.get('/pending-users', async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    const query = { approvalStatus: 'pending', emailVerified: true };
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Pending users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Superadmin
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.approvalStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/admin/approve-user/:userId
// @desc    Approve or reject a user
// @access  Superadmin
router.patch('/approve-user/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID required'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reason').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'User has already been processed' });
    }

    user.approvalStatus = status;
    await user.save();

    // Send email notification
    await sendApprovalEmail(user.email, user.name, status, user.role);

    // Log action
    await logAction(
      status === 'approved' ? auditActions.USER_APPROVED : auditActions.USER_REJECTED,
      { userId: req.user.userId, role: req.user.role },
      { targetUser: user._id, metadata: { reason } }
    );

    res.json({
      message: `User ${status} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Superadmin
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.approvalStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .populate('clubId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/admin/clubs
// @desc    Create a new club
// @access  Superadmin
router.post('/clubs', [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('facultyId').optional().isMongoId().withMessage('Valid faculty ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, description, facultyId, socialLinks } = req.body;

    // Check if club name exists
    const existingClub = await Club.findOne({ name });
    if (existingClub) {
      return res.status(400).json({ message: 'Club with this name already exists' });
    }

    // Verify faculty if provided
    if (facultyId) {
      const faculty = await User.findOne({ _id: facultyId, role: 'faculty', approvalStatus: 'approved' });
      if (!faculty) {
        return res.status(400).json({ message: 'Invalid faculty selected' });
      }
      // Ensure the faculty is not already assigned to another club
      if (faculty.clubId) {
        const existingClub = await Club.findById(faculty.clubId);
        // Check for stale data: does the club actually have this faculty assigned?
        const isReallyAssigned = existingClub &&
          existingClub.assignedFaculty?.toString() === faculty._id.toString();
        if (isReallyAssigned) {
          return res.status(400).json({
            message: `This faculty is already assigned to "${existingClub.name}". One faculty can only be assigned to one club.`
          });
        } else {
          // Stale clubId — clear it and allow assignment
          await User.findByIdAndUpdate(faculty._id, { clubId: null });
        }
      }
    }

    const club = new Club({
      name,
      description,
      createdBy: req.user.userId,
      assignedFaculty: facultyId || null,
      socialLinks
    });

    await club.save();

    // Update faculty's clubId if assigned
    if (facultyId) {
      await User.findByIdAndUpdate(facultyId, { clubId: club._id });
    }

    await logAction(auditActions.CLUB_CREATED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetClub: club._id,
      metadata: { name, facultyId }
    });

    res.status(201).json({
      message: 'Club created successfully',
      club
    });
  } catch (error) {
    console.error('Create club error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/clubs
// @desc    Get all clubs
// @access  Superadmin
router.get('/clubs', async (req, res) => {
  try {
    const clubs = await Club.find()
      .populate('assignedFaculty', 'name email department')
      .populate('coordinators', 'name email rollNo')
      .sort({ createdAt: -1 });

    res.json({ clubs });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/clubs/:clubId
// @desc    Update a club
// @access  Superadmin
router.put('/clubs/:clubId', [
  param('clubId').isMongoId().withMessage('Valid club ID required'),
  body('name').optional().trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('facultyId').optional({ nullable: true }).isMongoId().withMessage('Valid faculty ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { clubId } = req.params;
    const { name, description, socialLinks, facultyId, isActive } = req.body;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Handle faculty change
    if (facultyId !== undefined && facultyId !== club.assignedFaculty?.toString()) {
      if (facultyId) {
        // Verify the new faculty exists and is approved
        const newFaculty = await User.findOne({
          _id: facultyId,
          role: 'faculty',
          approvalStatus: 'approved'
        });

        if (!newFaculty) {
          return res.status(400).json({ message: 'Invalid faculty selected' });
        }

        // Check if the faculty is already assigned to another club
        if (newFaculty.clubId && newFaculty.clubId.toString() !== clubId) {
          const existingClub = await Club.findById(newFaculty.clubId);
          // Check for stale data: does the club actually have this faculty assigned?
          const isReallyAssigned = existingClub &&
            existingClub.assignedFaculty?.toString() === newFaculty._id.toString();
          if (isReallyAssigned) {
            return res.status(400).json({
              message: `This faculty is already assigned to "${existingClub.name}". One faculty can only be assigned to one club.`
            });
          } else {
            // Stale clubId — clear it and allow re-assignment
            await User.findByIdAndUpdate(newFaculty._id, { clubId: null });
          }
        }

        // Remove club from old faculty
        if (club.assignedFaculty) {
          await User.findByIdAndUpdate(club.assignedFaculty, { clubId: null });
        }
        // Assign club to new faculty
        await User.findByIdAndUpdate(facultyId, { clubId: club._id });
        club.assignedFaculty = facultyId;
      }
    }

    // Apply safe field updates (never directly assign req.body to avoid field pollution)
    if (name !== undefined) club.name = name;
    if (description !== undefined) club.description = description;
    if (socialLinks !== undefined) club.socialLinks = socialLinks;
    if (isActive !== undefined) club.isActive = isActive;

    await club.save();

    await logAction(auditActions.CLUB_UPDATED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetClub: club._id
    });

    res.json({
      message: 'Club updated successfully',
      club
    });
  } catch (error) {
    console.error('Update club error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/admin/clubs/:clubId/faculty
// @desc    Remove (unassign) the faculty from a club
// @access  Superadmin
router.delete('/clubs/:clubId/faculty', [
  param('clubId').isMongoId().withMessage('Valid club ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    if (!club.assignedFaculty) {
      return res.status(400).json({ message: 'No faculty is currently assigned to this club' });
    }

    // Clear clubId from the faculty user
    await User.findByIdAndUpdate(club.assignedFaculty, { clubId: null });

    club.assignedFaculty = null;
    await club.save();

    await logAction(auditActions.CLUB_UPDATED, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      targetClub: club._id,
      metadata: { action: 'faculty_unassigned' }
    });

    res.json({
      message: 'Faculty removed from club successfully',
      club
    });
  } catch (error) {
    console.error('Remove faculty error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/admin/clubs/:clubId/coordinators
// @desc    Assign coordinators to a club
// @access  Superadmin, Faculty (for their own club only)
router.post('/clubs/:clubId/coordinators',
  authenticate,
  authorize(['superadmin', 'faculty']),
  [
    param('clubId').isMongoId().withMessage('Valid club ID required'),
    body('studentIds').isArray({ min: 1 }).withMessage('At least one student ID required'),
    handleValidationErrors
  ], async (req, res) => {
    try {
      const { clubId } = req.params;
      const { studentIds } = req.body;

      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({ message: 'Club not found' });
      }

      // Faculty authorization: simplified - frontend controls which club faculty can access
      if (req.user.role === 'faculty') {
        // Just verify faculty exists and is approved
        const faculty = await User.findById(req.user.userId);
        if (!faculty || faculty.approvalStatus !== 'approved') {
          return res.status(403).json({
            message: 'Access denied'
          });
        }
      }

      // Verify all students exist and are approved
      const students = await User.find({
        _id: { $in: studentIds },
        role: 'student',
        approvalStatus: 'approved'
      });

      if (students.length !== studentIds.length) {
        return res.status(400).json({ message: 'Some students not found or not approved' });
      }

      // Add coordinators to club
      club.coordinators = [...new Set([...club.coordinators.map(String), ...studentIds])];
      await club.save();

      // Update students' role and clubId
      await User.updateMany(
        { _id: { $in: studentIds } },
        { role: 'coordinator', clubId: club._id }
      );

      await logAction(auditActions.COORDINATOR_ASSIGNED, {
        userId: req.user.userId,
        role: req.user.role
      }, {
        targetClub: club._id,
        metadata: { studentIds }
      });

      res.json({
        message: 'Coordinators assigned successfully',
        club
      });
    } catch (error) {
      console.error('Assign coordinators error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

// @route   DELETE /api/admin/clubs/:clubId/coordinators/:coordinatorId
// @desc    Remove a coordinator from a club
// @access  Superadmin, Faculty (for their own club only)
router.delete('/clubs/:clubId/coordinators/:coordinatorId',
  authenticate,
  authorize(['superadmin', 'faculty']),
  [
    param('clubId').isMongoId().withMessage('Valid club ID required'),
    param('coordinatorId').isMongoId().withMessage('Valid coordinator ID required'),
    handleValidationErrors
  ], async (req, res) => {
    try {
      const { clubId, coordinatorId } = req.params;

      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({ message: 'Club not found' });
      }

      // Faculty authorization: simplified - frontend controls which club faculty can access
      if (req.user.role === 'faculty') {
        // Just verify faculty exists and is approved
        const faculty = await User.findById(req.user.userId);
        if (!faculty || faculty.approvalStatus !== 'approved') {
          return res.status(403).json({
            message: 'Access denied'
          });
        }
      }

      // Check if the coordinator exists in this club
      const coordinatorIndex = club.coordinators.findIndex(
        coord => coord.toString() === coordinatorId
      );

      if (coordinatorIndex === -1) {
        return res.status(404).json({ message: 'Coordinator not found in this club' });
      }

      // Remove coordinator from club
      club.coordinators.splice(coordinatorIndex, 1);
      await club.save();

      // Revert user role back to student and clear clubId
      await User.findByIdAndUpdate(coordinatorId, {
        role: 'student',
        clubId: null
      });

      await logAction(auditActions.COORDINATOR_REMOVED, {
        userId: req.user.userId,
        role: req.user.role
      }, {
        targetClub: club._id,
        metadata: { coordinatorId }
      });

      res.json({
        message: 'Coordinator removed successfully',
        club
      });
    } catch (error) {
      console.error('Remove coordinator error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

// @route   GET /api/admin/pending-events
// @desc    Get pending event approvals
// @access  Superadmin
router.get('/pending-events', async (req, res) => {
  try {
    const events = await Event.find({ status: 'pending_approval' })
      .populate('clubId', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ events });
  } catch (error) {
    console.error('Pending events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/admin/approve-event/:eventId
// @desc    Approve or reject an event
// @access  Superadmin
router.patch('/approve-event/:eventId', [
  param('eventId').isMongoId().withMessage('Valid event ID required'),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reason').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, reason } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Event has already been processed' });
    }

    event.status = status;
    event.isPublished = status === 'approved';

    if (status === 'approved') {
      event.approvedBy = req.user.userId;
      event.approvedAt = new Date();
    } else {
      event.rejectionReason = reason;
    }

    await event.save();

    await logAction(
      status === 'approved' ? auditActions.EVENT_APPROVED : auditActions.EVENT_REJECTED,
      { userId: req.user.userId, role: req.user.role },
      { targetEvent: event._id, metadata: { reason } }
    );

    res.json({
      message: `Event ${status} successfully`,
      event
    });
  } catch (error) {
    console.error('Approve event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs
// @access  Superadmin
router.get('/audit-logs', async (req, res) => {
  try {
    const { action, page = 1, limit = 50 } = req.query;

    const query = {};
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email')
      .populate('targetEvent', 'title')
      .populate('targetClub', 'name')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
