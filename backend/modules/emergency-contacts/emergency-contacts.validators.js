import { body } from 'express-validator';

export const createContactValidator = [
  body('contactName')
    .trim()
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ max: 255 })
    .withMessage('Contact name must be under 255 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ max: 100 })
    .withMessage('Phone number or email must be under 100 characters'),
  body('relationship')
    .trim()
    .notEmpty()
    .withMessage('Relationship is required')
    .isLength({ max: 100 })
    .withMessage('Relationship details must be under 100 characters'),
  body('notifyOnSos')
    .optional()
    .isBoolean()
    .withMessage('notifyOnSos must be a boolean value'),
];

export const updateContactValidator = [
  body('contactName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Contact name must be under 255 characters'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Phone number or email must be under 100 characters'),
  body('relationship')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Relationship cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Relationship details must be under 100 characters'),
  body('notifyOnSos')
    .optional()
    .isBoolean()
    .withMessage('notifyOnSos must be a boolean value'),
];

export default {
  createContactValidator,
  updateContactValidator,
};
