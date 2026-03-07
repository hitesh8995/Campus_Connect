const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-passwordHash')
      .populate('clubId', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  authenticate,
  body('name').optional().trim().isLength({ min: 3, max: 50 }),
  body('section').optional().trim().isLength({ min: 1, max: 5 }),
  body('currentYear').optional().isInt({ min: 1, max: 6 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.email;
    delete updates.passwordHash;
    delete updates.role;
    delete updates.approvalStatus;
    delete updates.emailVerified;
    delete updates.rollNo;
    delete updates.facultyId;
    delete updates.department;
    delete updates.yearOfAdmission;
    delete updates.clubId;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    ).select('-passwordHash');
    
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', [
  authenticate,
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/faculty
// @desc    Get all faculty (for club assignment)
// @access  Superadmin
router.get('/faculty', authenticate, authorize(['superadmin']), async (req, res) => {
  try {
    const faculty = await User.find({ 
      role: 'faculty',
      approvalStatus: 'approved'
    })
      .select('name email department designation clubId')
      .sort({ name: 1 });
    
    res.json({ faculty });
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/students
// @desc    Get all approved students (for coordinator assignment)
// @access  Superadmin/Faculty
router.get('/students', authenticate, authorize(['superadmin', 'faculty']), async (req, res) => {
  try {
    const { department, year, search } = req.query;
    
    const query = { 
      role: 'student',
      approvalStatus: 'approved'
    };
    
    if (department) query.department = department;
    if (year) query.currentYear = parseInt(year);
    
    let studentsQuery = User.find(query)
      .select('name email rollNo department section currentYear')
      .sort({ name: 1 });
    
    const students = await studentsQuery;
    
    // Filter by search
    let filtered = students;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = students.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.rollNo?.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({ students: filtered });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
