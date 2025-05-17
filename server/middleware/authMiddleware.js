// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Need the User model
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');

// Middleware to protect routes - checks for valid JWT
const protect = async (req, res, next) => {
  let token;

  // Check if token is in the Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header ('Bearer TOKEN')
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch based on role in token
      if (decoded.role === 'admin' || decoded.role === 'super_admin') {
        req.user = await Admin.findById(decoded.id).select('-password'); // Fetch from Admin collection
        if (req.user && !req.user.isActive) {
            return res.status(403).json({ message: 'Admin account is not active.' });
        }
      } else if (decoded.role === 'agent') {
        req.user = await Agent.findById(decoded.id).select('-pin');
        if (req.user && !req.user.isActive) {
            return res.status(403).json({ message: 'Agent account is not active.' });
        }
      } else if (decoded.role === 'user') {
        req.user = await User.findById(decoded.id).select('-pin');
        // Optional: additional checks for regular user (e.g., isVerified)
      } else {
        return res.status(401).json({ message: 'Not authorized, invalid token role.' });
      }

      if (!req.user) {
          return res.status(401).json({ message: 'Not authorized, entity not found.' });
      }

      
      req.user.role = decoded.role; // Ensure role from token is on req.user
      next(); // Proceed to the next middleware/route handler

    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // If no token is provided
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// This middleware checks if the already authenticated req.user is an admin/super_admin
const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin.' });
    }
};

const superAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as a super admin.' });
    }
};

// New middleware specifically for AGENT routes
const agentProtect = (req, res, next) => {
    if (req.user && req.user.role === 'agent' && req.user.isActive) { // Also check if agent is active
        next();
    } else {
        let message = 'Not authorized as an active agent.';
        if (req.user && req.user.role === 'agent' && !req.user.isActive) {
            message = 'Agent account is not currently active.';
        }
        res.status(403).json({ message });
    }
};


module.exports = { protect, adminOnly, superAdminOnly, agentProtect };