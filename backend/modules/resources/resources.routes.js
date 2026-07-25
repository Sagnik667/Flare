import { Router } from 'express';
import * as resourcesController from './resources.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(resourcesController.getAll));
router.get('/nearby', asyncHandler(resourcesController.getNearby));
router.get('/:id', asyncHandler(resourcesController.getById));

export default router;
