import { body } from 'express-validator';

export const createSOSValidator = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid float between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid float between -180 and 180'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address description must be under 500 characters'),
];

export const resolveIncidentValidator = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution notes must be under 1000 characters'),
];

export default {
  createSOSValidator,
  resolveIncidentValidator,
};
