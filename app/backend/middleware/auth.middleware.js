const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. Invalid token format.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account has been deactivated.' });
    }
    
    if (user.isLocked) {
      return res.status(401).json({ message: 'Account is temporarily locked.' });
    }
    
    req.user = {
      userId: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      clubId: user.clubId
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    return res.status(500).json({ message: 'Authentication error.', error: error.message });
  }
};

// Check if user has required role
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Check if faculty belongs to the club
const requireClubAccess = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    
    if (req.user.role === 'superadmin') {
      return next();
    }
    
    if (req.user.role === 'faculty' || req.user.role === 'coordinator') {
      if (req.user.clubId && req.user.clubId.toString() === clubId) {
        return next();
      }
    }
    
    return res.status(403).json({ message: 'Access denied. Not authorized for this club.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error checking club access.', error: error.message });
  }
};

// Check if user is approved
const requireApproval = (req, res, next) => {
  // This will be checked after authenticate middleware
  // We need to fetch the full user to check approvalStatus
  const checkApproval = async () => {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found.' });
      }
      
      if (user.approvalStatus !== 'approved') {
        return res.status(403).json({ 
          message: 'Account pending approval.',
          status: user.approvalStatus
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Error checking approval status.', error: error.message });
    }
  };
  
  checkApproval();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive && !user.isLocked) {
      req.user = {
        userId: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
        clubId: user.clubId
      };
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  requireClubAccess,
  requireApproval,
  optionalAuth
};
