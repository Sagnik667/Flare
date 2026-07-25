import { Router } from 'express';
import * as authController from './auth.controller.js';
import { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator } from './auth.validators.js';
import { validateRequest } from '../../middleware/validate.js';
import { loginLimiter, forgotPasswordLimiter } from '../../middleware/rateLimiter.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.post(
  '/register',
  registerValidator,
  validateRequest,
  asyncHandler(authController.register)
);

router.post(
  '/login',
  loginLimiter,
  loginValidator,
  validateRequest,
  asyncHandler(authController.login)
);



router.post(
  '/refresh',
  asyncHandler(authController.refresh)
);

router.post(
  '/logout',
  asyncHandler(authController.logout)
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidator,
  validateRequest,
  asyncHandler(authController.forgotPassword)
);

router.post(
  '/reset-password',
  resetPasswordValidator,
  validateRequest,
  asyncHandler(authController.resetPassword)
);

router.get(
  '/dev-admin-credentials',
  asyncHandler(authController.getDevAdminCredentials)
);

export default router;
