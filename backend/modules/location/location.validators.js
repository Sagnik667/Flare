import { body, query } from 'express-validator';

export const updateLocationValidator = [
  body('incidentId')
    .isUUID()
    .withMessage('Incident ID must be a valid UUID'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid float between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid float between -180 and 180'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive float value'),
];

export const nearbyResourcesValidator = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat query parameter must be a valid float between -90 and 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('lng query parameter must be a valid float between -180 and 180'),
  query('radius')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('radius query parameter must be a positive number'),
  query('category')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('category query parameter must be a non-empty string'),
];

export default {
  updateLocationValidator,
  nearbyResourcesValidator,
};
