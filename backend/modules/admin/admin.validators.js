import { body } from 'express-validator';
import { USER_STATUS } from '../../utils/constants.js';

export const updateUserStatusValidator = [
  body('status')
    .isIn([USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED])
    .withMessage('Status must be either active or suspended'),
];

export const verifyVolunteerValidator = [
  body('action')
    .isIn(['verify', 'reject'])
    .withMessage('Action must be either verify or reject'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be under 500 characters'),
];

export const resourceValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Resource name is required'),
  body('category')
    .isIn(['police_station', 'hospital', 'clinic', 'womens_shelter', 'safe_zone', 'other'])
    .withMessage('Invalid safety resource category'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Resource address is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Resource phone number is required'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid float between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid float between -180 and 180'),
  body('opening_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage('Opening time must be in HH:MM format'),
  body('closing_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage('Closing time must be in HH:MM format'),
  body('weekly_closed_days')
    .optional()
    .isArray()
    .withMessage('Weekly closed days must be an array of integers'),
  body('weekly_closed_days.*')
    .isInt({ min: 0, max: 6 })
    .withMessage('Weekly closed days must be integers between 0 and 6'),
  body('special_closed_dates')
    .optional()
    .isArray()
    .withMessage('Special closed dates must be an array of date strings'),
  body('special_closed_dates.*')
    .isISO8601()
    .withMessage('Special closed dates must be valid ISO 8601 date strings'),
  body('is_permanently_closed')
    .optional()
    .isBoolean()
    .withMessage('is_permanently_closed must be a boolean'),
];

export default {
  updateUserStatusValidator,
  verifyVolunteerValidator,
  resourceValidator,
};
