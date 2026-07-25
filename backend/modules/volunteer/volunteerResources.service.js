import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import logger from '../../config/logger.js';
import { emitToAdmins, emitToUser } from '../../config/socket.js';
import { NOTIFICATION_TYPES } from '../../utils/constants.js';

// Haversine distance in km
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Evaluate status dynamically based on server time
export async function calculateResourceStatus(resource, targetTime = new Date()) {
  if (resource.is_permanently_closed) {
    return { status: 'orange', reason: 'permanently closed' };
  }

  // Check temporary closures
  const { rows: tempClosures } = await db.query(
    `SELECT * FROM resource_temporary_closures 
     WHERE resource_id = $1 
       AND closed_from <= $2 
       AND (closed_until IS NULL OR closed_until >= $2)`,
    [resource.id, targetTime]
  );
  if (tempClosures.length > 0) {
    const c = tempClosures[0];
    const untilStr = c.closed_until ? new Date(c.closed_until).toLocaleString() : 'unknown';
    return { status: 'orange', reason: `temporarily closed until ${untilStr}` };
  }

  // Check weekly closed days (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = targetTime.getDay();
  const { rows: weekly } = await db.query(
    'SELECT 1 FROM weekly_closed_days WHERE resource_id = $1 AND day_of_week = $2',
    [resource.id, dayOfWeek]
  );
  if (weekly.length > 0) {
    return { status: 'orange', reason: 'closed (weekly holiday)' };
  }

  // Check special closed dates (holidays)
  // Format Date to YYYY-MM-DD in local time
  const dateStr = targetTime.toISOString().split('T')[0];
  const { rows: special } = await db.query(
    'SELECT 1 FROM special_closed_dates WHERE resource_id = $1 AND closed_date = $2',
    [resource.id, dateStr]
  );
  if (special.length > 0) {
    return { status: 'orange', reason: 'closed (special holiday)' };
  }

  // Check operating hours
  const hours = targetTime.getHours();
  const mins = targetTime.getMinutes();
  const secs = targetTime.getSeconds();
  const currentSeconds = hours * 3600 + mins * 60 + secs;

  const [opH, opM, opS] = resource.opening_time.split(':').map(Number);
  const [clH, clM, clS] = resource.closing_time.split(':').map(Number);
  const openingSeconds = opH * 3600 + opM * 60 + (opS || 0);
  const closingSeconds = clH * 3600 + clM * 60 + (clS || 0);

  if (currentSeconds < openingSeconds || currentSeconds > closingSeconds) {
    return { status: 'orange', reason: `closed (outside hours: ${resource.opening_time.slice(0, 5)} - ${resource.closing_time.slice(0, 5)})` };
  }

  return { status: 'green', reason: `open until ${resource.closing_time.slice(0, 5)}` };
}

// Get safety resources within 100km of volunteer registered home coordinates
export const getVolunteerResources = async (userId) => {
  // Fetch volunteer profile
  const { rows: vols } = await db.query(
    'SELECT home_latitude, home_longitude FROM volunteers WHERE user_id = $1',
    [userId]
  );
  if (vols.length === 0) {
    const err = new Error('Volunteer profile not found');
    err.status = 404;
    throw err;
  }

  const { home_latitude: homeLat, home_longitude: homeLng } = vols[0];
  const lat1 = parseFloat(homeLat);
  const lng1 = parseFloat(homeLng);

  // Fetch all active registered resources
  const { rows: resources } = await db.query(
    'SELECT * FROM safety_resources WHERE is_active = true'
  );

  const data = [];
  for (const r of resources) {
    const rLat = parseFloat(r.latitude);
    const rLng = parseFloat(r.longitude);
    const dist = getDistanceKm(lat1, lng1, rLat, rLng);

    if (dist <= 100) {
      const dynamicState = await calculateResourceStatus(r);
      data.push({
        ...r,
        distance_km: dist,
        status: dynamicState.status,
        reason: dynamicState.reason,
      });
    }
  }

  // Sort by distance
  return data.sort((a, b) => a.distance_km - b.distance_km);
};

// Submitting a resource recommendation
export const recommendResource = async (userId, data) => {
  const {
    name, category, address, phone, latitude, longitude,
    opening_time = '00:00:00', closing_time = '23:59:59',
    weekly_closed_days = [], special_closed_dates = [],
    review = ''
  } = data;

  const id = uuidv4();
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const client = await db.getClient();
  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO resource_recommendations (id, name, category, address, phone, latitude, longitude, opening_time, closing_time, recommended_by, review, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
      [id, name, category, address, phone, lat, lng, opening_time, closing_time, userId, review]
    );

    if (weekly_closed_days && weekly_closed_days.length > 0) {
      for (const day of weekly_closed_days) {
        await client.query(
          `INSERT INTO recommended_weekly_closed_days (id, recommendation_id, day_of_week) VALUES ($1, $2, $3)`,
          [uuidv4(), id, day]
        );
      }
    }

    if (special_closed_dates && special_closed_dates.length > 0) {
      for (const dateStr of special_closed_dates) {
        await client.query(
          `INSERT INTO recommended_special_closed_dates (id, recommendation_id, closed_date) VALUES ($1, $2, $3)`,
          [uuidv4(), id, dateStr]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { id, name, status: 'pending' };
};

// Submitting a closure recommendation
export const recommendClosure = async (userId, data) => {
  const { resource_id, closure_type, closed_from, closed_until, until_unknown = false } = data;
  const id = uuidv4();

  await db.query(
    `INSERT INTO closure_recommendations (id, resource_id, recommended_by, closure_type, closed_from, closed_until, until_unknown, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [id, resource_id, userId, closure_type, closed_from, closed_until, until_unknown]
  );

  return { id, resource_id, status: 'pending' };
};

// Declare Emergency and auto notify closest open resources
export const declareEmergency = async (userId, incidentId) => {
  // Fetch incident details
  const { rows: incidents } = await db.query(
    'SELECT * FROM emergency_incidents WHERE id = $1',
    [incidentId]
  );
  if (incidents.length === 0) {
    const err = new Error('Incident not found');
    err.status = 404;
    throw err;
  }

  const incident = incidents[0];
  const triggerLat = parseFloat(incident.trigger_lat);
  const triggerLng = parseFloat(incident.trigger_lng);

  // Mark in timeline that Emergency was declared
  const timelineId = uuidv4();
  await db.query(
    `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description)
     VALUES ($1, $2, $3, 'EMERGENCY_DECLARED', 'Volunteer marked this incident as an Emergency.')`,
    [timelineId, incidentId, userId]
  );

  // Find all active registered safety resources
  const { rows: resources } = await db.query(
    `SELECT * FROM safety_resources WHERE is_active = true`
  );

  // Compute dynamic open state and distance
  const eligibleResources = [];
  for (const r of resources) {
    const dynamicState = await calculateResourceStatus(r);
    if (dynamicState.status === 'green') {
      const dist = getDistanceKm(triggerLat, triggerLng, parseFloat(r.latitude), parseFloat(r.longitude));
      if (dist <= 15) {
        eligibleResources.push({ ...r, distance_km: dist });
      }
    }
  }

  // Group by category and find the nearest one for police_station, hospital, safe_zone/ womens_shelter / fire station
  const categoriesToNotify = ['police_station', 'hospital', 'safe_zone', 'womens_shelter', 'clinic', 'other'];
  const notified = [];

  // Sort and select the closest for each category present
  for (const cat of categoriesToNotify) {
    const matches = eligibleResources.filter(r => r.category === cat).sort((a, b) => a.distance_km - b.distance_km);
    if (matches.length > 0) {
      const nearest = matches[0];
      notified.push(nearest);

      // Create notification entry for Admin/System audit log
      const notificationId = uuidv4();
      const adminText = `[RESOURCE AUTO-ALERT] Safety resource ${nearest.name} (${nearest.category}) was automatically notified of emergency incident ${incidentId}. Address: ${nearest.address}. Phone: ${nearest.phone}`;
      
      // Get admin user to assign notification
      const { rows: admins } = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      const adminId = admins.length > 0 ? admins[0].id : null;

      if (adminId) {
        await db.query(
          `INSERT INTO notifications (id, user_id, type, title, message, status, metadata)
           VALUES ($1, $2, 'emergency_resource_alert', $3, $4, 'unread', $5)`,
          [notificationId, adminId, 'Emergency Resource Notified', adminText, JSON.stringify({ resourceId: nearest.id, incidentId })]
        );
      }

      // Log notification dispatch details to logger
      logger.info(`[RESOURCE ALERT] Auto-notified nearest open resource: ${nearest.name} (${nearest.phone}) for incident ${incidentId}`);

      // Output dispatch trace to dev outbox for validation testing
      console.log(`DEV MAIL OUTBOX -> To: ${nearest.name.replace(/\s+/g, '').toLowerCase()}@flare.local | Subject: EMERGENCY ALERT - Responder Request`);
      logger.info(`DEV MAIL OUTBOX -> To: ${nearest.name.replace(/\s+/g, '').toLowerCase()}@flare.local | Subject: EMERGENCY ALERT - Responder Request`);
    }
  }

  // Socket notification delivery (Post-commit)
  try {
    emitToAdmins('emergency_declared', {
      incidentId,
      notifiedResources: notified.map(n => ({ id: n.id, name: n.name, distance_km: n.distance_km })),
    });
    emitToUser(incident.user_id, 'emergency_declared', { incidentId });
  } catch (socketError) {
    logger.error('Socket notifications failed on emergency declaration:', socketError);
  }

  return { incidentId, notifiedResources: notified.map(n => ({ id: n.id, name: n.name, category: n.category, distance_km: n.distance_km })) };
};
