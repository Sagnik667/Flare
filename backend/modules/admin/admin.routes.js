import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { updateUserStatusValidator, verifyVolunteerValidator, resourceValidator } from './admin.validators.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

// Secure all admin routes with auth guards
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get(
  '/dashboard',
  asyncHandler(adminController.dashboard)
);

router.get(
  '/incidents',
  asyncHandler(adminController.incidents)
);

router.get(
  '/users',
  asyncHandler(adminController.users)
);

router.patch(
  '/users/:id/status',
  updateUserStatusValidator,
  validateRequest,
  asyncHandler(adminController.updateUserStatus)
);

router.get(
  '/volunteers/pending',
  asyncHandler(adminController.pendingVolunteers)
);

router.patch(
  '/volunteers/:id/verify',
  verifyVolunteerValidator,
  validateRequest,
  asyncHandler(adminController.verifyVolunteer)
);

router.get(
  '/resources',
  asyncHandler(adminController.getResources)
);

router.post(
  '/resources',
  resourceValidator,
  validateRequest,
  asyncHandler(adminController.createResource)
);

router.put(
  '/resources/:id',
  resourceValidator,
  validateRequest,
  asyncHandler(adminController.updateResource)
);

router.delete(
  '/resources/:id',
  asyncHandler(adminController.deleteResource)
);

router.get(
  '/resources/recommendations',
  asyncHandler(adminController.getResourceRecommendations)
);

router.post(
  '/resources/recommendations/:id/review',
  asyncHandler(adminController.reviewResourceRecommendation)
);

router.get(
  '/resources/closures',
  asyncHandler(adminController.getClosureRecommendations)
);

router.post(
  '/resources/closures/:id/review',
  asyncHandler(adminController.reviewClosureRecommendation)
);

export default router;
