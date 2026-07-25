import { body } from 'express-validator';

export const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Full name must be under 255 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Must be a valid E.164 phone number'),
];

export const safetyProfileValidator = [
  body('bloodGroup')
    .optional({ checkFalsy: true })
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group type'),
  body('medicalNotes')
    .optional()
    .trim(),
  body('emergencyInstructions')
    .optional()
    .trim(),
  body('preferredLanguage')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Invalid preferred language'),
];

export const changePasswordValidator = [
  body('newPassword')
    .isLength({ min: 10 })
    .withMessage('New password must be at least 10 characters long')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/\d/)
    .withMessage('New password must contain at least one number')
    .matches(/[@$!%*?&]/)
    .withMessage('New password must contain at least one special character (@$!%*?&)'),
];

export default {
  updateProfileValidator,
  safetyProfileValidator,
  changePasswordValidator,
};
