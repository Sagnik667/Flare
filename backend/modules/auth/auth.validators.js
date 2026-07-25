import { body } from 'express-validator';
import { ROLES } from '../../utils/constants.js';

export const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name must not be empty'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email must not be empty')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn([ROLES.WOMAN, ROLES.VOLUNTEER])
    .withMessage('Role must be either woman or volunteer'),
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email must not be empty')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password must not be empty'),
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
];

export const resetPasswordValidator = [
  body('token').trim().notEmpty().withMessage('Token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];



export default {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
};
