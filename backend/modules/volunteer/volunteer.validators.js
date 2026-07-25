import { body } from 'express-validator';
import { ASSIGNMENT_STATUS } from '../../utils/constants.js';

export const registerVolunteerValidator = [
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('serviceRadiusKm')
    .isInt({ min: 1, max: 50 })
    .withMessage('Service radius must be an integer between 1 and 50 km'),
  body('age')
    .isInt({ min: 18 })
    .withMessage('Age must be 18 or older'),
  body('governmentIdType')
    .trim()
    .notEmpty()
    .withMessage('Government ID type is required'),
  body('governmentIdNumber')
    .trim()
    .notEmpty()
    .withMessage('Government ID number is required'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('latitude')
    .notEmpty()
    .withMessage('Latitude coordinate is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude coordinate (must be between -90 and 90)'),
  body('longitude')
    .notEmpty()
    .withMessage('Longitude coordinate is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude coordinate (must be between -180 and 180)'),
];

export const acceptIncidentValidator = [
  body('incidentId')
    .isUUID()
    .withMessage('Incident ID must be a valid UUID'),
];

export const updateStatusValidator = [
  body('incidentId')
    .isUUID()
    .withMessage('Incident ID must be a valid UUID'),
  body('status')
    .isIn([
      ASSIGNMENT_STATUS.EN_ROUTE,
      ASSIGNMENT_STATUS.ARRIVED,
      ASSIGNMENT_STATUS.ASSISTING,
      ASSIGNMENT_STATUS.RESOLVED,
    ])
    .withMessage('Invalid response status value'),
];

export const updateAvailabilityValidator = [
  body('isAvailable')
    .isBoolean()
    .withMessage('isAvailable must be a boolean value'),
];

export default {
  registerVolunteerValidator,
  acceptIncidentValidator,
  updateStatusValidator,
  updateAvailabilityValidator,
};
