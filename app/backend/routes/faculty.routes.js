const express = require('express');
const { param, body, validationResult } = require('express-validator');
const router = express.Router();
const { User, Club } = require('../models');
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

// All faculty routes require authentication + faculty role
router.use(authenticate);
router.use(authorize(['faculty']));

// @route   POST /api/faculty/clubs/:clubId/coordinators
// @desc    Assign coordinators to the faculty's club
// @access  Faculty
router.post(
    '/clubs/:clubId/coordinators',
    [
        param('clubId').isMongoId().withMessage('Valid club ID required'),
        body('studentIds').isArray({ min: 1 }).withMessage('At least one student ID required'),
        handleValidationErrors,
    ],
    async (req, res) => {
        try {
            const { clubId } = req.params;
            const { studentIds } = req.body;

            // Verify the faculty is approved
            const faculty = await User.findById(req.user.userId);
            if (!faculty || faculty.approvalStatus !== 'approved') {
                return res.status(403).json({ message: 'Access denied' });
            }

            const club = await Club.findById(clubId);
            if (!club) {
                return res.status(404).json({ message: 'Club not found' });
            }

            // Ensure the faculty is assigned to this specific club
            const facultyClubId = faculty.clubId
                ? faculty.clubId.toString()
                : null;
            if (facultyClubId !== clubId) {
                return res.status(403).json({
                    message: 'You can only manage coordinators for your own club',
                });
            }

            // Verify all students exist and are approved
            const students = await User.find({
                _id: { $in: studentIds },
                role: 'student',
                approvalStatus: 'approved',
            });

            if (students.length !== studentIds.length) {
                return res
                    .status(400)
                    .json({ message: 'Some students not found or not approved' });
            }

            // Add coordinators (avoid duplicates)
            club.coordinators = [
                ...new Set([...club.coordinators.map(String), ...studentIds]),
            ];
            await club.save();

            // Promote students to coordinator role
            await User.updateMany(
                { _id: { $in: studentIds } },
                { role: 'coordinator', clubId: club._id }
            );

            await logAction(
                auditActions.COORDINATOR_ASSIGNED,
                { userId: req.user.userId, role: req.user.role },
                { targetClub: club._id, metadata: { studentIds } }
            );

            res.json({ message: 'Coordinators assigned successfully', club });
        } catch (error) {
            console.error('Assign coordinators error:', error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
);

// @route   DELETE /api/faculty/clubs/:clubId/coordinators/:coordinatorId
// @desc    Remove a coordinator from the faculty's club
// @access  Faculty
router.delete(
    '/clubs/:clubId/coordinators/:coordinatorId',
    [
        param('clubId').isMongoId().withMessage('Valid club ID required'),
        param('coordinatorId').isMongoId().withMessage('Valid coordinator ID required'),
        handleValidationErrors,
    ],
    async (req, res) => {
        try {
            const { clubId, coordinatorId } = req.params;

            // Verify the faculty is approved
            const faculty = await User.findById(req.user.userId);
            if (!faculty || faculty.approvalStatus !== 'approved') {
                return res.status(403).json({ message: 'Access denied' });
            }

            const club = await Club.findById(clubId);
            if (!club) {
                return res.status(404).json({ message: 'Club not found' });
            }

            // Ensure the faculty is assigned to this specific club
            const facultyClubId = faculty.clubId
                ? faculty.clubId.toString()
                : null;
            if (facultyClubId !== clubId) {
                return res.status(403).json({
                    message: 'You can only manage coordinators for your own club',
                });
            }

            // Check coordinator exists in this club
            const coordinatorIndex = club.coordinators.findIndex(
                (coord) => coord.toString() === coordinatorId
            );

            if (coordinatorIndex === -1) {
                return res
                    .status(404)
                    .json({ message: 'Coordinator not found in this club' });
            }

            // Remove from club
            club.coordinators.splice(coordinatorIndex, 1);
            await club.save();

            // Revert user back to student
            await User.findByIdAndUpdate(coordinatorId, {
                role: 'student',
                clubId: null,
            });

            await logAction(
                auditActions.COORDINATOR_REMOVED,
                { userId: req.user.userId, role: req.user.role },
                { targetClub: club._id, metadata: { coordinatorId } }
            );

            res.json({ message: 'Coordinator removed successfully', club });
        } catch (error) {
            console.error('Remove coordinator error:', error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
);

module.exports = router;
