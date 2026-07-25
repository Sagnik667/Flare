import rateLimit from 'express-rate-limit';
import ApiResponse from '../utils/apiResponse.js';

// General rate limiter: 200 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    ApiResponse.error(res, 'Too many requests, please try again later.', null, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter: 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    ApiResponse.error(res, 'Too many login attempts. Please try again after 15 minutes.', null, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot password rate limiter: 3 attempts per hour
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    ApiResponse.error(res, 'Too many password reset requests. Please try again after an hour.', null, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});



// SOS Rate Limiter: strict dedicated limiter (5 requests per 1 minute)
export const sosLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    ApiResponse.error(res, 'SOS rate limit exceeded. Please wait a moment before sending another request.', null, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  generalLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  sosLimiter,
};
