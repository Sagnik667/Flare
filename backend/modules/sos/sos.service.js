import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { ROLES, INCIDENT_STATUS, NOTIFICATION_TYPES } from '../../utils/constants.js';
import { getHaversineDistance } from '../../utils/geoUtils.js';
import { emitToVolunteer, emitToAdmins, emitToUser, emitToIncident } from '../../config/socket.js';
import { sendMail } from '../../config/mailer.js';
import { getSosAlertTemplate } from '../../utils/emailTemplates.js';
import logger from '../../config/logger.js';
import { createNotification } from '../notifications/notifications.service.js';

export const createSOS = async ({ userId, latitude, longitude, address = '' }) => {
  // 1. Verify caller is a woman (Route & Service layer check)
  const { rows: userRows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
  if (userRows.length === 0 || userRows[0].role !== ROLES.WOMAN) {
    const err = new Error('Only woman users can create SOS incidents');
    err.status = 403;
    throw err;
  }

  // Validate coordinates range
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  if (isNaN(latNum) || latNum < -90 || latNum > 90 || isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    const err = new Error('Invalid geolocation coordinates');
    err.status = 400;
    throw err;
  }

  // 2. Single Active Incident Rule
  const activeStatuses = [
    INCIDENT_STATUS.ACTIVE,
    INCIDENT_STATUS.VOLUNTEER_ASSIGNED,
    INCIDENT_STATUS.VOLUNTEER_EN_ROUTE,
    INCIDENT_STATUS.VOLUNTEER_ARRIVED,
    INCIDENT_STATUS.ASSISTING,
  ];

  const { rows: activeIncidents } = await db.query(
    `SELECT * FROM emergency_incidents 
     WHERE user_id = $1 AND status = ANY($2) 
     ORDER BY created_at DESC LIMIT 1`,
    [userId, activeStatuses]
  );

  if (activeIncidents.length > 0) {
    logger.info(`Woman user ${userId} requested new SOS but has an active incident: ${activeIncidents[0].id}`);
    return activeIncidents[0]; // Return existing, do not duplicate
  }

  // Find verified, available, active volunteers from DB to calculate nearby matches
  const { rows: volunteers } = await db.query(
    `SELECT v.id, v.user_id, v.home_latitude, v.home_longitude, v.service_radius_km, u.full_name, u.email 
     FROM volunteers v
     JOIN users u ON v.user_id = u.id
     WHERE v.verification_status = 'verified' AND v.is_available = true AND u.status = 'active'`
  );

  const matchedVolunteers = [];
  for (const vol of volunteers) {
    const distance = getHaversineDistance(
      latNum,
      lngNum,
      parseFloat(vol.home_latitude),
      parseFloat(vol.home_longitude)
    );
    if (distance <= vol.service_radius_km) {
      matchedVolunteers.push(vol);
    }
  }

  // 3. Begin Transaction (Complete transaction: incidents, locations, timeline, notifications)
  const client = await db.getClient();
  const incidentId = uuidv4();
  const locationId = uuidv4();
  const timelineId = uuidv4();
  const womanNotificationId = uuidv4();
  let incident;

  const notificationsToEmit = [];

  await client.query('BEGIN');
  try {
    // 3.1. Insert Incident
    const incidentRes = await client.query(
      `INSERT INTO emergency_incidents (id, user_id, status, trigger_lat, trigger_lng, trigger_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [incidentId, userId, INCIDENT_STATUS.ACTIVE, latNum, lngNum, address]
    );
    incident = incidentRes.rows[0];

    // 3.2. Insert First Location Row (Append-only)
    await client.query(
      `INSERT INTO incident_locations (id, incident_id, latitude, longitude, accuracy)
       VALUES ($1, $2, $3, $4, $5)`,
      [locationId, incidentId, latNum, lngNum, 10.0]
    );

    // 3.3. Insert First Timeline Event (SOS_CREATED)
    await client.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description)
       VALUES ($1, $2, $3, 'SOS_CREATED', $4)`,
      [timelineId, incidentId, userId, 'SOS emergency incident initiated.']
    );

    // 3.4. Insert Notification for the Woman user
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, message, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'unread', $6)`,
      [
        womanNotificationId,
        userId,
        NOTIFICATION_TYPES.SOS_CREATED,
        'SOS Emergency Triggered',
        'Your emergency distress signal has been broadcast. Help is on the way.',
        JSON.stringify({ incidentId }),
      ]
    );
    notificationsToEmit.push({
      userId,
      notification: {
        id: womanNotificationId,
        userId,
        type: NOTIFICATION_TYPES.SOS_CREATED,
        title: 'SOS Emergency Triggered',
        message: 'Your emergency distress signal has been broadcast. Help is on the way.',
        status: 'unread',
        metadata: { incidentId },
        createdAt: new Date().toISOString(),
      },
    });

    // 3.5. Insert Notifications and Timeline Events for nearby volunteers
    for (const vol of matchedVolunteers) {
      const volNotificationId = uuidv4();
      const volTimelineId = uuidv4();

      await client.query(
        `INSERT INTO notifications (id, user_id, type, title, message, status, metadata)
         VALUES ($1, $2, $3, $4, $5, 'unread', $6)`,
        [
          volNotificationId,
          vol.user_id,
          NOTIFICATION_TYPES.SOS_CREATED,
          'Emergency Alert Nearby',
          `An SOS alert has been triggered within your ${vol.service_radius_km}km service range.`,
          JSON.stringify({ incidentId, triggerAddress: address }),
        ]
      );

      notificationsToEmit.push({
        userId: vol.user_id,
        notification: {
          id: volNotificationId,
          userId: vol.user_id,
          type: NOTIFICATION_TYPES.SOS_CREATED,
          title: 'Emergency Alert Nearby',
          message: `An SOS alert has been triggered within your ${vol.service_radius_km}km service range.`,
          status: 'unread',
          metadata: { incidentId, triggerAddress: address },
          createdAt: new Date().toISOString(),
        },
      });

      await client.query(
        `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
         VALUES ($1, $2, NULL, 'VOLUNTEER_NOTIFIED', $3, $4)`,
        [volTimelineId, incidentId, `Volunteer ${vol.full_name} notified.`, JSON.stringify({ volunteerId: vol.id })]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create SOS transaction:', error);
    throw error;
  } finally {
    client.release();
  }

  // 4. Dispatch Socket Signals (Post-commit)
  try {
    // Send standard push notifications via socket
    for (const item of notificationsToEmit) {
      emitToUser(item.userId, 'notification', item.notification);
    }

    // Alert nearby volunteers of incoming SOS
    for (const vol of matchedVolunteers) {
      emitToVolunteer(vol.user_id, 'volunteer_alert', {
        incidentId,
        userId,
        latitude: latNum,
        longitude: lngNum,
        address,
        createdAt: incident.created_at,
      });
    }

    // Notify admins
    emitToAdmins('incident_created', {
      incidentId,
      userId,
      latitude: latNum,
      longitude: lngNum,
      address,
    });
  } catch (socketError) {
    logger.error('Socket notification dispatch failed, session recovered:', socketError);
  }

  // 5. Notify Emergency Contacts (Async background task - email failure does not affect request)
  triggerEmergencyContactEmails(userId, incidentId, latNum, lngNum).catch(err => {
    logger.error('Failed to trigger emergency contact emails:', err);
  });

  return incident;
};

const triggerEmergencyContactEmails = async (userId, incidentId, lat, lng) => {
  try {
    const { rows: contacts } = await db.query(
      'SELECT * FROM emergency_contacts WHERE user_id = $1 AND notify_on_sos = true',
      [userId]
    );

    if (contacts.length === 0) return;

    const { rows: userRows } = await db.query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const womanName = userRows.length > 0 ? userRows[0].full_name : 'A user';

    const mapUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/incidents/${incidentId}`;

    for (const contact of contacts) {
      // Send mail, default fallback is logging + fake recipient if no valid email format in phone
      const recipient = contact.phone.includes('@') ? contact.phone : 'contact@flare.local';
      sendMail({
        to: recipient,
        subject: `EMERGENCY ALERT: ${womanName} triggered SOS!`,
        html: getSosAlertTemplate(womanName, mapUrl),
      }).catch(error => {
        logger.error(`Error sending email to contact ${contact.contact_name}:`, error);
      });
    }
  } catch (error) {
    logger.error('Failed to fetch emergency contacts for email alert:', error);
  }
};

export const getIncidentHistory = async (userId, { page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;

  const countRes = await db.query(
    'SELECT COUNT(*) FROM emergency_incidents WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await db.query(
    `SELECT ei.*, 
            json_build_object('id', u.id, 'name', u.full_name) as user_info,
            (SELECT json_agg(loc ORDER BY timestamp ASC) FROM incident_locations loc WHERE loc.incident_id = ei.id) as locations,
            (SELECT json_agg(t ORDER BY timestamp ASC) FROM incident_timeline t WHERE t.incident_id = ei.id) as timeline
     FROM emergency_incidents ei
     JOIN users u ON ei.user_id = u.id
     WHERE ei.user_id = $1
     ORDER BY ei.created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const pages = Math.ceil(total / limit) || 1;

  return {
    incidents: rows,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
  };
};

export const getIncidentDetails = async (incidentId, userId, role) => {
  const { rows } = await db.query(
    `SELECT ei.*, 
            json_build_object('id', u.id, 'name', u.full_name) as user_info
     FROM emergency_incidents ei
     JOIN users u ON ei.user_id = u.id
     WHERE ei.id = $1`,
    [incidentId]
  );

  if (rows.length === 0) {
    const err = new Error('Incident not found');
    err.status = 404;
    throw err;
  }

  const incident = rows[0];

  // Auth check: Only woman owner, assigned volunteer, or admin can view details
  if (role === ROLES.WOMAN && incident.user_id !== userId) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  if (role === ROLES.VOLUNTEER) {
    const { rows: assignment } = await db.query(
      `SELECT ia.id FROM incident_assignments ia
       JOIN volunteers v ON ia.volunteer_id = v.id
       WHERE ia.incident_id = $1 AND v.user_id = $2`,
      [incidentId, userId]
    );
    if (assignment.length === 0) {
      const err = new Error('Access denied: You are not assigned to this incident');
      err.status = 403;
      throw err;
    }
  }

  const { rows: locations } = await db.query(
    'SELECT * FROM incident_locations WHERE incident_id = $1 ORDER BY timestamp ASC',
    [incidentId]
  );

  const { rows: timeline } = await db.query(
    'SELECT * FROM incident_timeline WHERE incident_id = $1 ORDER BY created_at ASC',
    [incidentId]
  );

  const { rows: volunteerAssigned } = await db.query(
    `SELECT v.*, u.full_name, u.phone 
     FROM incident_assignments ia
     JOIN volunteers v ON ia.volunteer_id = v.id
     JOIN users u ON v.user_id = u.id
     WHERE ia.incident_id = $1 AND ia.assignment_status = 'accepted'`,
    [incidentId]
  );

  return {
    ...incident,
    locations,
    timeline,
    volunteer: volunteerAssigned.length > 0 ? volunteerAssigned[0] : null,
  };
};

export const resolveIncident = async (incidentId, userId, role, notes = '') => {
  const { rows } = await db.query(
    'SELECT * FROM emergency_incidents WHERE id = $1',
    [incidentId]
  );

  if (rows.length === 0) {
    const err = new Error('Incident not found');
    err.status = 404;
    throw err;
  }

  const incident = rows[0];

  if (incident.status === INCIDENT_STATUS.RESOLVED || incident.status === INCIDENT_STATUS.CANCELLED) {
    const err = new Error('Incident is already resolved or cancelled');
    err.status = 400;
    throw err;
  }

  // 1. Authorization: Only assigned volunteer, incident owner, or admin can resolve (Service Layer Check)
  let isAuthorized = false;

  if (role === ROLES.ADMIN) {
    isAuthorized = true;
  } else if (role === ROLES.WOMAN && incident.user_id === userId) {
    isAuthorized = true;
  } else if (role === ROLES.VOLUNTEER) {
    const { rows: activeAssignment } = await db.query(
      `SELECT ia.id FROM incident_assignments ia
       JOIN volunteers v ON ia.volunteer_id = v.id
       WHERE ia.incident_id = $1 AND v.user_id = $2 AND ia.assignment_status = ANY($3)`,
      [incidentId, userId, ['accepted', 'en_route', 'arrived', 'assisting']]
    );
    if (activeAssignment.length > 0) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const err = new Error('Access denied: You are not authorized to resolve this incident');
    err.status = 403;
    throw err;
  }

  const client = await db.getClient();
  await client.query('BEGIN');
  try {
    // 2. Update incident
    await client.query(
      `UPDATE emergency_incidents 
       SET status = $1, resolved_at = NOW(), resolution_notes = $2, updated_at = NOW() 
       WHERE id = $3`,
      [INCIDENT_STATUS.RESOLVED, notes, incidentId]
    );

    // 3. Update active assignments
    await client.query(
      `UPDATE incident_assignments 
       SET assignment_status = 'resolved', resolved_at = NOW() 
       WHERE incident_id = $1 AND assignment_status = ANY($2)`,
      [incidentId, ['accepted', 'en_route', 'arrived', 'assisting']]
    );

    // 4. Create timeline event (INCIDENT_RESOLVED)
    await client.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description)
       VALUES ($1, $2, $3, 'INCIDENT_RESOLVED', $4)`,
      [uuidv4(), incidentId, userId, `Incident resolved by actor. Notes: ${notes || 'none'}`]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to resolve incident:', error);
    throw error;
  } finally {
    client.release();
  }

  // 5. Create notifications for the woman
  await createNotification({
    userId: incident.user_id,
    type: NOTIFICATION_TYPES.INCIDENT_RESOLVED,
    title: 'Incident Resolved',
    message: 'Your emergency incident has been successfully marked as resolved.',
    metadata: { incidentId },
  });

  // 6. Create notification for assigned volunteer (if any)
  const { rows: assignmentRows } = await db.query(
    `SELECT v.user_id FROM incident_assignments ia
     JOIN volunteers v ON ia.volunteer_id = v.id
     WHERE ia.incident_id = $1 AND ia.assignment_status = 'resolved'`,
    [incidentId]
  );
  if (assignmentRows.length > 0) {
    const volunteerUserId = assignmentRows[0].user_id;
    await createNotification({
      userId: volunteerUserId,
      type: NOTIFICATION_TYPES.INCIDENT_RESOLVED,
      title: 'Incident Resolved',
      message: 'The SOS emergency you responded to has been marked as resolved.',
      metadata: { incidentId },
    });
  }

  // 7. Socket emits
  emitToAdmins('incident_updated', { incidentId, status: INCIDENT_STATUS.RESOLVED });
  emitToIncident(incidentId, 'volunteer_status_updated', { incidentId, status: INCIDENT_STATUS.RESOLVED });
  emitToUser(incident.user_id, 'volunteer_status_updated', { incidentId, status: INCIDENT_STATUS.RESOLVED });
  emitToIncident(incidentId, 'incident_resolved', { incidentId, status: INCIDENT_STATUS.RESOLVED });
  emitToUser(incident.user_id, 'incident_resolved', { incidentId, status: INCIDENT_STATUS.RESOLVED });

  return { id: incidentId, status: INCIDENT_STATUS.RESOLVED };
};
