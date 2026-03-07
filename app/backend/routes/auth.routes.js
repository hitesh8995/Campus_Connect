const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { User, OTP } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt.utils');
const { sendOTPEmail, sendApprovalEmail } = require('../utils/email.service');
const { logAction, auditActions } = require('../utils/audit.utils');
const { authenticate } = require('../middleware/auth.middleware');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   POST /api/auth/signup-student
// @desc    Register a new student
// @access  Public
router.post('/signup-student', [
  body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email')
    .matches(/@mlritm\.ac\.in$/).withMessage('Please use your college email (@mlritm.ac.in)'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('rollNo').matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10}$/).withMessage('Roll number must be 10 alphanumeric characters'),
  body('department').isIn(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'CSBS', 'OTHER']).withMessage('Invalid department'),
  body('section').trim().isLength({ min: 1, max: 5 }).withMessage('Section is required'),
  body('yearOfAdmission').isInt({ min: 2000, max: 2030 }).withMessage('Invalid year of admission'),
  body('currentYear').isInt({ min: 1, max: 6 }).withMessage('Current year must be 1-6'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, email, password, rollNo, department, section, yearOfAdmission, currentYear } = req.body;

    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if roll number exists
    const existingRollNo = await User.findOne({ rollNo });
    if (existingRollNo) {
      return res.status(400).json({ message: 'Roll number already registered' });
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = new User({
      role: 'student',
      name,
      email,
      passwordHash,
      rollNo,
      department,
      section,
      yearOfAdmission,
      currentYear,
      approvalStatus: 'pending',
      emailVerified: false
    });

    await user.save();

    // Generate and send OTP
    const { otpDoc, plainOTP } = await OTP.createOTP(user._id, email, 'email_verification');
    await sendOTPEmail(email, plainOTP, 'email_verification');

    res.status(201).json({
      message: 'Student registered successfully. Please verify your email with the OTP sent.',
      userId: user._id,
      email: user.email
    });
  } catch (error) {
    console.error('Student signup error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// @route   POST /api/auth/signup-faculty
// @desc    Register a new faculty member
// @access  Public
router.post('/signup-faculty', [
  body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email')
    .matches(/@mlritm\.ac\.in$/).withMessage('Please use your college email (@mlritm.ac.in)'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('facultyId').trim().isLength({ min: 4, max: 20 }).withMessage('Faculty ID must be 4-20 characters'),
  body('department').isIn(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'CSBS', 'OTHER']).withMessage('Invalid department'),
  body('designation').isIn(['Assistant Professor', 'Associate Professor', 'HOD', 'Director', 'Principal', 'Lecturer']).withMessage('Invalid designation'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, email, password, facultyId, department, designation } = req.body;

    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if faculty ID exists
    const existingFacultyId = await User.findOne({ facultyId });
    if (existingFacultyId) {
      return res.status(400).json({ message: 'Faculty ID already registered' });
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = new User({
      role: 'faculty',
      name,
      email,
      passwordHash,
      facultyId,
      department,
      designation,
      approvalStatus: 'pending',
      emailVerified: false
    });

    await user.save();

    // Generate and send OTP
    const { otpDoc, plainOTP } = await OTP.createOTP(user._id, email, 'email_verification');
    await sendOTPEmail(email, plainOTP, 'email_verification');

    res.status(201).json({
      message: 'Faculty registered successfully. Please verify your email with the OTP sent.',
      userId: user._id,
      email: user.email
    });
  } catch (error) {
    console.error('Faculty signup error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post('/verify-otp', [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { userId, otp } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find OTP
    const otpRecord = await OTP.findOne({ userId, type: 'email_verification' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    // Verify OTP
    const result = await otpRecord.verifyOTP(otp);

    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    // Mark email as verified
    user.emailVerified = true;
    await user.save();

    res.json({
      message: 'Email verified successfully. Please wait for admin approval.',
      emailVerified: true
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during OTP verification', error: error.message });
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP
// @access  Public
router.post('/resend-otp', [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Create new OTP
    const { otpDoc, plainOTP } = await OTP.createOTP(user._id, user.email, 'email_verification');
    await sendOTPEmail(user.email, plainOTP, 'email_verification');

    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({ message: 'Account is temporarily locked. Please try again later.' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check email verification
    if (!user.emailVerified) {
      return res.status(401).json({
        message: 'Email not verified. Please verify your email first.',
        code: 'EMAIL_NOT_VERIFIED',
        userId: user._id
      });
    }

    // Check approval status
    if (user.approvalStatus === 'pending') {
      return res.status(401).json({
        message: 'Account pending admin approval.',
        code: 'PENDING_APPROVAL'
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(401).json({
        message: 'Account has been rejected. Please contact admin.',
        code: 'ACCOUNT_REJECTED'
      });
    }

    // Reset login attempts
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    // Log action
    await logAction(auditActions.USER_LOGIN, {
      userId: user._id,
      role: user.role
    }, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        clubId: user.clubId ? (typeof user.clubId === 'object' ? user.clubId._id || user.clubId.id : user.clubId) : null,
        approvalStatus: user.approvalStatus
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public (with refresh token)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired', code: 'REFRESH_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a reset OTP has been sent.' });
    }

    // Generate and send OTP
    const { otpDoc, plainOTP } = await OTP.createOTP(user._id, email, 'password_reset');
    await sendOTPEmail(email, plainOTP, 'password_reset');

    res.json({
      message: 'If the email exists, a reset OTP has been sent.',
      userId: user._id
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find OTP
    const otpRecord = await OTP.findOne({ userId, type: 'password_reset' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    // Verify OTP
    const result = await otpRecord.verifyOTP(otp);

    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    // Update password
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    await logAction(auditActions.USER_LOGOUT, {
      userId: req.user.userId,
      role: req.user.role
    }, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-passwordHash')
      .populate('clubId', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
