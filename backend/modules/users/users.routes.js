import { Router } from 'express';
import * as usersController from './users.controller.js';
import { updateProfileValidator, safetyProfileValidator, changePasswordValidator } from './users.validators.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

router.get(
  '/profile',
  asyncHandler(usersController.getProfile)
);

router.put(
  '/profile',
  updateProfileValidator,
  validateRequest,
  asyncHandler(usersController.updateProfile)
);

router.get(
  '/profile/safety',
  authorize(ROLES.WOMAN),
  asyncHandler(usersController.getSafetyProfile)
);

router.put(
  '/profile/safety',
  authorize(ROLES.WOMAN),
  safetyProfileValidator,
  validateRequest,
  asyncHandler(usersController.updateSafetyProfile)
);

router.put(
  '/change-password',
  changePasswordValidator,
  validateRequest,
  asyncHandler(usersController.changePassword)
);

export default router;
