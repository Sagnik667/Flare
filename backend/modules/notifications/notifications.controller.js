import * as notificationsService from './notifications.service.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getNotifications = async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  
  const { notifications, unreadCount, pagination } = await notificationsService.getNotifications(req.user.id, { page, limit });
  
  return res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: notifications,
    unreadCount,
    pagination,
    timestamp: new Date().toISOString(),
  });
};

export const markAsRead = async (req, res) => {
  const { id } = req.params;
  const updated = await notificationsService.markAsRead(id, req.user.id);
  return ApiResponse.success(res, 'Notification marked as read', updated);
};

export const markAllAsRead = async (req, res) => {
  await notificationsService.markAllAsRead(req.user.id);
  return ApiResponse.success(res, 'All notifications marked as read');
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
