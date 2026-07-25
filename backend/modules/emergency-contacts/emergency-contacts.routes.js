import { Router } from 'express';
import * as contactController from './emergency-contacts.controller.js';
import { createContactValidator, updateContactValidator } from './emergency-contacts.validators.js';
import { validateRequest } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.WOMAN));

router.get(
  '/',
  asyncHandler(contactController.getContacts)
);

router.post(
  '/',
  createContactValidator,
  validateRequest,
  asyncHandler(contactController.createContact)
);

router.put(
  '/:id',
  updateContactValidator,
  validateRequest,
  asyncHandler(contactController.updateContact)
);

router.delete(
  '/:id',
  asyncHandler(contactController.deleteContact)
);

export default router;
