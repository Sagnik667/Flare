import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './logger.js';
import db from './database.js';
import { USER_STATUS, ROLES } from '../utils/constants.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_development_only_replace_in_production_environment_variables';

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'flare' });
      
      // Load user role and status
      const { rows } = await db.query(
        'SELECT role, status FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (rows.length === 0) {
        return next(new Error('Authentication error: User not found'));
      }

      const user = rows[0];
      if (user.status === USER_STATUS.SUSPENDED) {
        return next(new Error('Authentication error: Account suspended'));
      }

      socket.userId = decoded.userId;
      socket.userRole = user.role;
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`);

    // Join personal user room
    socket.join(`user:${socket.userId}`);

    // Join group rooms based on roles
    if (socket.userRole === ROLES.VOLUNTEER) {
      socket.join(`volunteer:${socket.userId}`);
      logger.debug(`Socket client ${socket.id} joined 'volunteer:${socket.userId}' room`);
    } else if (socket.userRole === ROLES.ADMIN) {
      socket.join('admins');
      logger.debug(`Socket client ${socket.id} joined 'admins' room`);
    }

    // Handle joining specific incident monitoring room (Secured with access checks)
    socket.on('join_incident', async (incidentId, callback) => {
      try {
        const { rows: incidentRows } = await db.query(
          'SELECT user_id FROM emergency_incidents WHERE id = $1',
          [incidentId]
        );

        if (incidentRows.length === 0) {
          logger.warn(`Socket client ${socket.id} tried to join non-existent incident: ${incidentId}`);
          if (callback) callback({ success: false, error: 'Incident not found' });
          return;
        }

        const incident = incidentRows[0];
        let isAuthorized = false;

        if (socket.userRole === ROLES.ADMIN) {
          isAuthorized = true;
        } else if (socket.userRole === ROLES.WOMAN && incident.user_id === socket.userId) {
          isAuthorized = true;
        } else if (socket.userRole === ROLES.VOLUNTEER) {
          const { rows: assignmentRows } = await db.query(
            `SELECT ia.id FROM incident_assignments ia
             JOIN volunteers v ON ia.volunteer_id = v.id
             WHERE ia.incident_id = $1 AND v.user_id = $2`,
            [incidentId, socket.userId]
          );
          if (assignmentRows.length > 0) {
            isAuthorized = true;
          }
        }

        if (isAuthorized) {
          socket.join(`incident:${incidentId}`);
          logger.info(`Socket client ${socket.id} authorized and joined room 'incident:${incidentId}'`);
          if (callback) callback({ success: true });
        } else {
          logger.warn(`Socket client ${socket.id} unauthorized join attempt to incident: ${incidentId}`);
          if (callback) callback({ success: false, error: 'Unauthorized access' });
        }
      } catch (err) {
        logger.error('Error authorizing socket join_incident:', err);
        if (callback) callback({ success: false, error: 'Server error' });
      }
    });

    // Listen for volunteer live location updates and broadcast to incident room
    socket.on('update_location', (data) => {
      if (socket.userRole === ROLES.VOLUNTEER && data.incidentId) {
        logger.debug(`Socket volunteer ${socket.userId} streaming coordinates for incident ${data.incidentId}`);
        io.to(`incident:${data.incidentId}`).emit('volunteer_location', {
          incidentId: data.incidentId,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
        });
      }
    });

    socket.on('leave_incident', (incidentId) => {
      socket.leave(`incident:${incidentId}`);
      logger.info(`Socket client ${socket.id} left room 'incident:${incidentId}'`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};

// Emits payload to a specific volunteer
export const emitToVolunteer = (volunteerUserId, event, payload) => {
  if (io) io.to(`volunteer:${volunteerUserId}`).emit(event, payload);
};

// Emits payload to admins room
export const emitToAdmins = (event, payload) => {
  if (io) io.to('admins').emit(event, payload);
};

// Emits payload to a specific user
export const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

// Emits payload to a specific incident channel
export const emitToIncident = (incidentId, event, payload) => {
  if (io) io.to(`incident:${incidentId}`).emit(event, payload);
};


export default {
  initSocket,
  getIO,
  emitToVolunteer,
  emitToAdmins,
  emitToUser,
  emitToIncident,
};
