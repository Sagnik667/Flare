import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { emitToUser } from '../../config/socket.js';
import logger from '../../config/logger.js';

export const createNotification = async ({ userId, type, title, message, metadata = null }) => {
  const id = uuidv4();
  const createdAt = new Date();

  await db.query(
    `INSERT INTO notifications (id, user_id, type, title, message, status, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, 'unread', $6, $7)`,
    [id, userId, type, title, message, metadata ? JSON.stringify(metadata) : null, createdAt]
  );

  const notification = {
    id,
    userId,
    type,
    title,
    message,
    status: 'unread',
    metadata,
    createdAt: createdAt.toISOString(),
  };

  // Real-time socket delivery
  try {
    emitToUser(userId, 'notification', notification);
  } catch (error) {
    logger.error('Failed to emit notification socket event:', error);
  }

  return notification;
};

export const getNotifications = async (userId, { page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;

  const countRes = await db.query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const unreadRes = await db.query(
    "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND status = 'unread'",
    [userId]
  );
  const unreadCount = parseInt(unreadRes.rows[0].count, 10);

  const { rows } = await db.query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const pages = Math.ceil(total / limit) || 1;

  return {
    notifications: rows,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
};

export const markAsRead = async (notificationId, userId) => {
  const { rows } = await db.query(
    `UPDATE notifications 
     SET status = 'read' 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notificationId, userId]
  );

  if (rows.length === 0) {
    const err = new Error('Notification not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

export const markAllAsRead = async (userId) => {
  await db.query(
    `UPDATE notifications 
     SET status = 'read' 
     WHERE user_id = $1 AND status = 'unread'`,
    [userId]
  );
};

export default {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
