import { Router } from 'express';
import * as locationController from './location.controller.js';
import { updateLocationValidator, nearbyResourcesValidator } from './location.validators.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

router.post(
  '/update',
  authorize(ROLES.WOMAN),
  updateLocationValidator,
  validateRequest,
  asyncHandler(locationController.update)
);

router.get(
  '/incident/:id',
  authorize(ROLES.WOMAN, ROLES.VOLUNTEER, ROLES.ADMIN),
  asyncHandler(locationController.getIncidentLocations)
);

router.get(
  '/resources/nearby',
  authorize(ROLES.WOMAN, ROLES.VOLUNTEER, ROLES.ADMIN),
  nearbyResourcesValidator,
  validateRequest,
  asyncHandler(locationController.getNearbyResources)
);

export default router;
