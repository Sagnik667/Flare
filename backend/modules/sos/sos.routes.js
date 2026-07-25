import { Router } from 'express';
import * as sosController from './sos.controller.js';
import { createSOSValidator, resolveIncidentValidator } from './sos.validators.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { sosLimiter } from '../../middleware/rateLimiter.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

router.post(
  '/create',
  authorize(ROLES.WOMAN),
  sosLimiter,
  createSOSValidator,
  validateRequest,
  asyncHandler(sosController.create)
);

router.get(
  '/history',
  authorize(ROLES.WOMAN),
  asyncHandler(sosController.history)
);

router.get(
  '/:id',
  authorize(ROLES.WOMAN, ROLES.VOLUNTEER, ROLES.ADMIN),
  asyncHandler(sosController.getIncident)
);

router.patch(
  '/:id/resolve',
  authorize(ROLES.WOMAN, ROLES.VOLUNTEER, ROLES.ADMIN),
  resolveIncidentValidator,
  validateRequest,
  asyncHandler(sosController.resolve)
);

export default router;
