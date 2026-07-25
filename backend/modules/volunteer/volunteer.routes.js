import { Router } from 'express';
import * as volunteerController from './volunteer.controller.js';
import { registerVolunteerValidator, acceptIncidentValidator, updateStatusValidator, updateAvailabilityValidator } from './volunteer.validators.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate, authorize, requireVerifiedVolunteer } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

// Registration (Multipart form upload, runs validation after body parsed by Multer)
router.post(
  '/register',
  authorize(ROLES.WOMAN, ROLES.VOLUNTEER),
  upload.single('document'),
  registerVolunteerValidator,
  validateRequest,
  asyncHandler(volunteerController.register)
);

router.get(
  '/profile',
  authorize(ROLES.WOMAN, ROLES.VOLUNTEER),
  asyncHandler(volunteerController.getProfile)
);

router.patch(
  '/availability',
  authorize(ROLES.VOLUNTEER),
  updateAvailabilityValidator,
  validateRequest,
  asyncHandler(volunteerController.updateAvailability)
);

// Protected by Verification Gate (Only verified volunteers allowed)
router.get(
  '/alerts',
  authorize(ROLES.VOLUNTEER),
  requireVerifiedVolunteer,
  asyncHandler(volunteerController.getAlerts)
);

router.post(
  '/accept',
  authorize(ROLES.VOLUNTEER),
  requireVerifiedVolunteer,
  acceptIncidentValidator,
  validateRequest,
  asyncHandler(volunteerController.accept)
);

router.patch(
  '/status',
  authorize(ROLES.VOLUNTEER),
  requireVerifiedVolunteer,
  updateStatusValidator,
  validateRequest,
  asyncHandler(volunteerController.updateStatus)
);

// Safety Resource routes
router.get(
  '/resources',
  authorize(ROLES.VOLUNTEER),
  requireVerifiedVolunteer,
  asyncHandler(volunteerController.getResources)
);

router.post(
  '/resources/recommend',
  authorize(ROLES.VOLUNTEER),
  requireVerifiedVolunteer,
  asyncHandler(volunteerController.recommendResource)
);

router.post(
  '/resources/recommend-closure',
  authorize(ROLES.VOLUNTEER),
  requireVerifiedVolunteer,
  asyncHandler(volunteerController.recommendClosure)
);

router.post(
  '/incident/:id/emergency',
  authorize(ROLES.VOLUNTEER),
  requireVerifiedVolunteer,
  asyncHandler(volunteerController.declareEmergency)
);

export default router;
