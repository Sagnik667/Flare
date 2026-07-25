import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import { USER_STATUS } from '../utils/constants.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_development_only_replace_in_production_environment_variables';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Authorization token required', null, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'flare' });
    
    // Fetch user from DB
    const { rows } = await db.query(
      'SELECT id, full_name, email, phone, role, status, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 'User not found', null, 401);
    }

    const user = rows[0];

    // Check if account is suspended
    if (user.status === USER_STATUS.SUSPENDED) {
      return ApiResponse.error(res, 'Account is suspended', null, 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired', { code: 'TOKEN_EXPIRED' }, 401);
    }
    return ApiResponse.error(res, 'Invalid authorization token', null, 401);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required', null, 401);
    }
    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Unauthorized access', null, 403);
    }
    next();
  };
};

export const requireVerifiedVolunteer = async (req, res, next) => {
  if (!req.user || req.user.role !== 'volunteer') {
    return ApiResponse.error(res, 'Access denied: Volunteer role required', null, 403);
  }

  const { rows } = await db.query(
    'SELECT verification_status FROM volunteers WHERE user_id = $1',
    [req.user.id]
  );

  if (rows.length === 0 || rows[0].verification_status !== 'verified') {
    return ApiResponse.error(res, 'Access denied: Volunteer account is not verified', null, 403);
  }

  next();
};

export default {
  authenticate,
  authorize,
  requireVerifiedVolunteer,
};
