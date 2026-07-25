import { Router } from 'express';
import * as notificationsController from './notifications.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(notificationsController.getNotifications));
router.patch('/read-all', asyncHandler(notificationsController.markAllAsRead));
router.patch('/:id/read', asyncHandler(notificationsController.markAsRead));

export default router;
