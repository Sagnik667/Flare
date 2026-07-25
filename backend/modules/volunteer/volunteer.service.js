import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { ROLES, INCIDENT_STATUS, ASSIGNMENT_STATUS, VOLUNTEER_STATUS, NOTIFICATION_TYPES } from '../../utils/constants.js';
import { getHaversineDistance } from '../../utils/geoUtils.js';
import { emitToUser, emitToAdmins, emitToIncident } from '../../config/socket.js';
import { createNotification } from '../notifications/notifications.service.js';
import { geocodeAddress } from '../../utils/geocoder.js';
import logger from '../../config/logger.js';

import fs from 'fs';
import path from 'path';

const getFileSignature = (filePath) => {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    return buffer.toString('hex');
  } catch (err) {
    logger.error('Failed to read file signature:', err);
    return '';
  }
};

const verifyAddressConsistency = async (lat, lng, submittedAddress) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FlareVolunteerGeocoding/1.0 (contact@flareapp.org)',
      },
    });

    if (!response.ok) {
      logger.warn(`Nominatim reverse geocoding failed with status: ${response.status}.`);
      return true; // Don't reject valid registrations if OpenStreetMap is down
    }

    const data = await response.json();
    if (!data || !data.display_name) {
      return false;
    }

    const reverseAddr = data.display_name.toLowerCase();
    const cleanSubmitted = submittedAddress.toLowerCase();

    // Extract alphanumeric words longer than 3 characters
    const getWords = (str) => {
      return str
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);
    };

    const submittedWords = getWords(cleanSubmitted);
    const reverseWords = getWords(reverseAddr);

    if (submittedWords.length > 0) {
      const hasOverlap = submittedWords.some(word => reverseAddr.includes(word) || reverseWords.includes(word));
      if (!hasOverlap) {
        logger.warn(`Address mismatch. Submitted: "${submittedAddress}", Reverse: "${data.display_name}"`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error during address reverse geocoding verification:', error);
    return true; // Resilient: bypass check on lookup error
  }
};

export const registerVolunteer = async (userId, { address, serviceRadiusKm, documentUrl, age, governmentIdType, governmentIdNumber, fullName, latitude, longitude, filePath }) => {
  // 1. Check duplicate volunteer profiles (including pending)
  const { rows: existing } = await db.query(
    'SELECT id, verification_status FROM volunteers WHERE user_id = $1',
    [userId]
  );

  if (existing.length > 0) {
    const status = existing[0].verification_status;
    if (status === 'pending') {
      const err = new Error('Duplicate volunteer application exists.');
      err.status = 400;
      throw err;
    } else if (status === 'verified') {
      const err = new Error('Volunteer profile already exists');
      err.status = 400;
      throw err;
    }
  }

  // 2. Age check
  const parsedAge = parseInt(age, 10);
  if (isNaN(parsedAge) || parsedAge < 18) {
    const err = new Error('Age must be at least 18.');
    err.status = 400;
    throw err;
  }

  // 3. File validation (magic bytes check)
  if (filePath && fs.existsSync(filePath)) {
    const signature = getFileSignature(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let isValidSignature = false;

    if (ext === '.png' && signature.startsWith('89504e47')) {
      isValidSignature = true;
    } else if ((ext === '.jpg' || ext === '.jpeg') && signature.startsWith('ffd8ff')) {
      isValidSignature = true;
    } else if (ext === '.pdf' && signature.startsWith('25504446')) {
      isValidSignature = true;
    }

    if (!isValidSignature) {
      const err = new Error('Document signature verification failed.');
      err.status = 400;
      throw err;
    }
  } else {
    const err = new Error('ID Document file upload is required');
    err.status = 400;
    throw err;
  }

  // 4. Coordinates boundary check
  const parsedLat = parseFloat(latitude);
  const parsedLng = parseFloat(longitude);

  if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
    const err = new Error('Selected location is invalid.');
    err.status = 400;
    throw err;
  }

  // 5. Reverse geocoding address consistency check
  const isConsistent = await verifyAddressConsistency(parsedLat, parsedLng, address);
  if (!isConsistent) {
    const err = new Error('Address could not be verified.');
    err.status = 400;
    throw err;
  }

  // 6. DB transaction
  await db.query('BEGIN');
  try {
    // Update user's full_name
    if (fullName) {
      await db.query(
        'UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2',
        [fullName, userId]
      );
    }

    const id = uuidv4();
    const radius = parseInt(serviceRadiusKm || '5', 10);

    // Insert volunteer profile (User role remains 'woman' until admin verification)
    const { rows } = await db.query(
      `INSERT INTO volunteers (id, user_id, verification_status, document_url, address, home_latitude, home_longitude, service_radius_km, is_available, age, government_id_type, government_id_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [id, userId, VOLUNTEER_STATUS.PENDING, documentUrl, address, parsedLat, parsedLng, radius, true, parsedAge, governmentIdType, governmentIdNumber]
    );

    await db.query('COMMIT');
    return rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

export const getVolunteerProfile = async (userId) => {
  const { rows } = await db.query(
    `SELECT v.*, u.full_name, u.email, u.phone 
     FROM volunteers v 
     JOIN users u ON v.user_id = u.id 
     WHERE v.user_id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('Volunteer profile not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

export const updateAvailability = async (userId, isAvailable) => {
  const { rows } = await db.query(
    `UPDATE volunteers 
     SET is_available = $1, updated_at = NOW() 
     WHERE user_id = $2 
     RETURNING *`,
    [isAvailable, userId]
  );

  if (rows.length === 0) {
    const err = new Error('Volunteer profile not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

export const getActiveAlerts = async (userId) => {
  // Fetch volunteer details
  const { rows: volRows } = await db.query(
    'SELECT id, home_latitude, home_longitude, service_radius_km, verification_status FROM volunteers WHERE user_id = $1',
    [userId]
  );

  if (volRows.length === 0) {
    const err = new Error('Volunteer profile not found');
    err.status = 404;
    throw err;
  }

  const vol = volRows[0];

  // Verification status check (Service Layer Check)
  if (vol.verification_status !== VOLUNTEER_STATUS.VERIFIED) {
    const err = new Error('Access denied: Volunteer account is not verified');
    err.status = 403;
    throw err;
  }

  // Retrieve active incidents not assigned to this volunteer
  const { rows: activeIncidents } = await db.query(
    `SELECT ei.*, u.full_name as user_name 
     FROM emergency_incidents ei 
     JOIN users u ON ei.user_id = u.id 
     WHERE ei.status = 'active' AND NOT EXISTS (
       SELECT 1 FROM incident_assignments ia 
       WHERE ia.incident_id = ei.id AND ia.volunteer_id = $1
     )`,
    [vol.id]
  );

  // Filter based on service radius
  const filtered = activeIncidents
    .map((ei) => {
      const distance = getHaversineDistance(
        parseFloat(ei.trigger_lat),
        parseFloat(ei.trigger_lng),
        parseFloat(vol.home_latitude),
        parseFloat(vol.home_longitude)
      );
      return { ...ei, distanceKm: distance };
    })
    .filter((ei) => ei.distanceKm <= vol.service_radius_km)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return filtered;
};

export const acceptIncident = async (userId, incidentId) => {
  // Fetch volunteer profile
  const { rows: volRows } = await db.query(
    'SELECT id, verification_status FROM volunteers WHERE user_id = $1',
    [userId]
  );

  if (volRows.length === 0) {
    const err = new Error('Volunteer profile not found');
    err.status = 404;
    throw err;
  }

  const vol = volRows[0];

  // Verification status check (Service Layer Check)
  if (vol.verification_status !== VOLUNTEER_STATUS.VERIFIED) {
    const err = new Error('Access denied: Volunteer account is not verified');
    err.status = 403;
    throw err;
  }

  // Active assignment limit check: volunteer may only have ONE active assignment
  const activeAssignmentStatuses = [
    ASSIGNMENT_STATUS.ACCEPTED,
    ASSIGNMENT_STATUS.EN_ROUTE,
    ASSIGNMENT_STATUS.ARRIVED,
    ASSIGNMENT_STATUS.ASSISTING,
  ];

  const { rows: existingAssignments } = await db.query(
    `SELECT id FROM incident_assignments 
     WHERE volunteer_id = $1 AND assignment_status = ANY($2)`,
    [vol.id, activeAssignmentStatuses]
  );

  if (existingAssignments.length > 0) {
    const err = new Error('Volunteer already has an active emergency assignment');
    err.status = 400;
    throw err;
  }

  const client = await db.getClient();
  const assignmentId = uuidv4();
  const timelineId = uuidv4();
  const notificationId = uuidv4();
  let incident;

  // Database Transaction + SELECT FOR UPDATE to prevent race conditions
  await client.query('BEGIN');
  try {
    // Lock incident row
    const incidentRes = await client.query(
      'SELECT id, status, user_id FROM emergency_incidents WHERE id = $1 FOR UPDATE',
      [incidentId]
    );

    if (incidentRes.rows.length === 0) {
      const err = new Error('Incident not found');
      err.status = 404;
      throw err;
    }

    incident = incidentRes.rows[0];

    // Verify incident is still available (status must be 'active')
    if (incident.status !== INCIDENT_STATUS.ACTIVE) {
      const err = new Error('Incident has already been accepted by another responder');
      err.status = 409; // Conflict response code
      throw err;
    }

    // Insert assignment row
    await client.query(
      `INSERT INTO incident_assignments (id, incident_id, volunteer_id, assignment_status, accepted_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [assignmentId, incidentId, vol.id, ASSIGNMENT_STATUS.ACCEPTED]
    );

    // Update incident status
    await client.query(
      `UPDATE emergency_incidents 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      [INCIDENT_STATUS.VOLUNTEER_ASSIGNED, incidentId]
    );

    // Insert timeline event (VOLUNTEER_ACCEPTED)
    await client.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description)
       VALUES ($1, $2, $3, 'VOLUNTEER_ACCEPTED', $4)`,
      [timelineId, incidentId, userId, `Incident accepted by volunteer.`]
    );

    // Insert notification for the woman user
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, message, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'unread', $6)`,
      [
        notificationId,
        incident.user_id,
        NOTIFICATION_TYPES.VOLUNTEER_ACCEPTED,
        'Responder Assigned',
        'A verified safety volunteer has accepted your SOS and is preparing to respond.',
        JSON.stringify({ incidentId, assignmentId }),
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to accept incident transaction:', error);
    throw error;
  } finally {
    client.release();
  }

  // Socket notification delivery (Post-commit)
  try {
    emitToUser(incident.user_id, 'notification', {
      id: notificationId,
      userId: incident.user_id,
      type: NOTIFICATION_TYPES.VOLUNTEER_ACCEPTED,
      title: 'Responder Assigned',
      message: 'A verified safety volunteer has accepted your SOS and is preparing to respond.',
      status: 'unread',
      metadata: { incidentId, assignmentId },
      createdAt: new Date().toISOString(),
    });

    emitToUser(incident.user_id, 'volunteer_accepted', {
      incidentId,
      volunteerId: vol.id,
    });

    emitToAdmins('incident_updated', {
      incidentId,
      status: INCIDENT_STATUS.VOLUNTEER_ASSIGNED,
    });
  } catch (socketError) {
    logger.error('Socket notifications failed on accept incident:', socketError);
  }

  return { incidentId, assignmentId, status: ASSIGNMENT_STATUS.ACCEPTED };
};

export const updateResponseStatus = async (userId, incidentId, newStatus) => {
  // Fetch volunteer profile
  const { rows: volRows } = await db.query(
    'SELECT id, verification_status FROM volunteers WHERE user_id = $1',
    [userId]
  );

  if (volRows.length === 0) {
    const err = new Error('Volunteer profile not found');
    err.status = 404;
    throw err;
  }

  const vol = volRows[0];

  // Verification status check (Service Layer Check)
  if (vol.verification_status !== VOLUNTEER_STATUS.VERIFIED) {
    const err = new Error('Access denied: Volunteer account is not verified');
    err.status = 403;
    throw err;
  }

  // Fetch active assignment
  const { rows: assignments } = await db.query(
    `SELECT * FROM incident_assignments 
     WHERE incident_id = $1 AND volunteer_id = $2`,
    [incidentId, vol.id]
  );

  if (assignments.length === 0) {
    const err = new Error('No assignment found for this incident');
    err.status = 404;
    throw err;
  }

  const assignment = assignments[0];

  // Enforce status state machine transitions
  let targetIncidentStatus;
  let timelineEventType;
  let timelineDescription;
  let updateField;
  let womanNotificationTitle;
  let womanNotificationMsg;
  let womanNotificationType;

  if (assignment.assignment_status === ASSIGNMENT_STATUS.ACCEPTED && newStatus === ASSIGNMENT_STATUS.EN_ROUTE) {
    targetIncidentStatus = INCIDENT_STATUS.VOLUNTEER_EN_ROUTE;
    timelineEventType = 'VOLUNTEER_EN_ROUTE';
    timelineDescription = 'Volunteer is en route to incident location.';
    updateField = 'assignment_status = \'en_route\'';
    womanNotificationType = NOTIFICATION_TYPES.VOLUNTEER_ASSIGNED;
    womanNotificationTitle = 'Responder En Route';
    womanNotificationMsg = 'The assigned responder is currently en route to your location.';
  } else if (assignment.assignment_status === ASSIGNMENT_STATUS.EN_ROUTE && newStatus === ASSIGNMENT_STATUS.ARRIVED) {
    targetIncidentStatus = INCIDENT_STATUS.VOLUNTEER_ARRIVED;
    timelineEventType = 'VOLUNTEER_ARRIVED';
    timelineDescription = 'Volunteer has arrived at incident location.';
    updateField = 'assignment_status = \'arrived\', arrived_at = NOW()';
    womanNotificationType = NOTIFICATION_TYPES.VOLUNTEER_ARRIVED;
    womanNotificationTitle = 'Responder Arrived';
    womanNotificationMsg = 'The responder has arrived at your location.';
  } else if (assignment.assignment_status === ASSIGNMENT_STATUS.ARRIVED && newStatus === ASSIGNMENT_STATUS.ASSISTING) {
    targetIncidentStatus = INCIDENT_STATUS.ASSISTING;
    timelineEventType = 'ASSISTANCE_STARTED';
    timelineDescription = 'Volunteer has started active assistance.';
    updateField = 'assignment_status = \'assisting\'';
    womanNotificationType = NOTIFICATION_TYPES.SYSTEM;
    womanNotificationTitle = 'Assistance Active';
    womanNotificationMsg = 'Responder is currently assisting you.';
  } else if (assignment.assignment_status === ASSIGNMENT_STATUS.ASSISTING && newStatus === ASSIGNMENT_STATUS.RESOLVED) {
    targetIncidentStatus = INCIDENT_STATUS.RESOLVED;
    timelineEventType = 'INCIDENT_RESOLVED';
    timelineDescription = 'Incident marked as resolved by volunteer responder.';
    updateField = 'assignment_status = \'resolved\', resolved_at = NOW()';
    womanNotificationType = NOTIFICATION_TYPES.INCIDENT_RESOLVED;
    womanNotificationTitle = 'Incident Resolved';
    womanNotificationMsg = 'The responder has marked this safety incident as resolved.';
  } else {
    const err = new Error(`Invalid status transition from ${assignment.assignment_status} to ${newStatus}`);
    err.status = 400;
    throw err;
  }

  // Fetch incident to get woman user_id
  const { rows: incidentRows } = await db.query(
    'SELECT user_id FROM emergency_incidents WHERE id = $1',
    [incidentId]
  );
  const incidentOwnerId = incidentRows[0].user_id;

  const client = await db.getClient();
  const timelineId = uuidv4();
  const notificationId = uuidv4();

  await client.query('BEGIN');
  try {
    // 1. Update assignment status
    await client.query(
      `UPDATE incident_assignments 
       SET ${updateField} 
       WHERE id = $1`,
      [assignment.id]
    );

    // 2. Update incident status
    const updateIncidentSql = newStatus === ASSIGNMENT_STATUS.RESOLVED
      ? `UPDATE emergency_incidents SET status = $1, resolved_at = NOW(), updated_at = NOW() WHERE id = $2`
      : `UPDATE emergency_incidents SET status = $1, updated_at = NOW() WHERE id = $2`;
    await client.query(updateIncidentSql, [targetIncidentStatus, incidentId]);

    // 3. Insert timeline event
    await client.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [timelineId, incidentId, userId, timelineEventType, timelineDescription]
    );

    // 4. Insert notification for woman user
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, message, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'unread', $6)`,
      [
        notificationId,
        incidentOwnerId,
        womanNotificationType,
        womanNotificationTitle,
        womanNotificationMsg,
        JSON.stringify({ incidentId }),
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to update volunteer response status transaction:', error);
    throw error;
  } finally {
    client.release();
  }

  // Emit socket events (Post-commit)
  try {
    emitToUser(incidentOwnerId, 'notification', {
      id: notificationId,
      userId: incidentOwnerId,
      type: womanNotificationType,
      title: womanNotificationTitle,
      message: womanNotificationMsg,
      status: 'unread',
      metadata: { incidentId },
      createdAt: new Date().toISOString(),
    });

    emitToUser(incidentOwnerId, 'volunteer_status_updated', {
      incidentId,
      status: targetIncidentStatus,
    });

    emitToIncident(incidentId, 'volunteer_status_updated', {
      incidentId,
      status: targetIncidentStatus,
    });

    if (targetIncidentStatus === INCIDENT_STATUS.RESOLVED) {
      emitToUser(incidentOwnerId, 'incident_resolved', { incidentId, status: targetIncidentStatus });
      emitToIncident(incidentId, 'incident_resolved', { incidentId, status: targetIncidentStatus });
    }

    emitToAdmins('incident_updated', {
      incidentId,
      status: targetIncidentStatus,
    });
  } catch (socketError) {
    logger.error('Socket emits failed on update response status:', socketError);
  }

  return { incidentId, status: newStatus };
};
