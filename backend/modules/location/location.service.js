import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { ROLES, INCIDENT_STATUS } from '../../utils/constants.js';
import { getHaversineDistance, filterByRadius } from '../../utils/geoUtils.js';
import { emitToIncident, emitToAdmins } from '../../config/socket.js';
import logger from '../../config/logger.js';

export const updateUserLocation = async (userId, { incidentId, latitude, longitude, accuracy = 10.0 }) => {
  // Validate coordinates ranges
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  if (isNaN(latNum) || latNum < -90 || latNum > 90 || isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    const err = new Error('Invalid coordinates range');
    err.status = 400;
    throw err;
  }

  // Fetch incident to verify ownership and active status
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

  // Verify ownership
  if (incident.user_id !== userId) {
    const err = new Error('Access denied: You do not own this incident');
    err.status = 403;
    throw err;
  }

  // Verify active status (reject if resolved or cancelled)
  const activeStatuses = [
    INCIDENT_STATUS.ACTIVE,
    INCIDENT_STATUS.VOLUNTEER_ASSIGNED,
    INCIDENT_STATUS.VOLUNTEER_EN_ROUTE,
    INCIDENT_STATUS.VOLUNTEER_ARRIVED,
    INCIDENT_STATUS.ASSISTING,
  ];

  if (!activeStatuses.includes(incident.status)) {
    const err = new Error('Cannot update location for an inactive incident');
    err.status = 400;
    throw err;
  }

  const id = uuidv4();
  const timestamp = new Date();

  // Append new location (Never UPDATE)
  await db.query(
    `INSERT INTO incident_locations (id, incident_id, latitude, longitude, accuracy, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, incidentId, latNum, lngNum, parseFloat(accuracy), timestamp]
  );

  const locationUpdate = {
    incidentId,
    latitude: latNum,
    longitude: lngNum,
    accuracy: parseFloat(accuracy),
    timestamp: timestamp.toISOString(),
  };

  // Socket emissions
  try {
    emitToIncident(incidentId, 'user_location_updated', locationUpdate);
    emitToAdmins('location_updated', { incidentId, latitude: latNum, longitude: lngNum });
  } catch (error) {
    logger.error('Failed to emit location update via sockets:', error);
  }

  return locationUpdate;
};

export const getIncidentLocations = async (incidentId, userId, role) => {
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

  // Verify access: Woman owner, assigned volunteer, or admin
  let isAuthorized = false;

  if (role === ROLES.ADMIN) {
    isAuthorized = true;
  } else if (role === ROLES.WOMAN && incident.user_id === userId) {
    isAuthorized = true;
  } else if (role === ROLES.VOLUNTEER) {
    const { rows: assignment } = await db.query(
      `SELECT ia.id FROM incident_assignments ia
       JOIN volunteers v ON ia.volunteer_id = v.id
       WHERE ia.incident_id = $1 AND v.user_id = $2`,
      [incidentId, userId]
    );
    if (assignment.length > 0) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  const { rows: locations } = await db.query(
    'SELECT * FROM incident_locations WHERE incident_id = $1 ORDER BY timestamp ASC',
    [incidentId]
  );

  return locations;
};

export const getNearbyResources = async (lat, lng, { radius = 5, category = null }) => {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) {
    const err = new Error('Latitude and Longitude are required parameters');
    err.status = 400;
    throw err;
  }

  let queryText = 'SELECT * FROM safety_resources WHERE is_active = true';
  const queryParams = [];

  if (category) {
    queryText += ' AND category = $1';
    queryParams.push(category);
  }

  const { rows: resources } = await db.query(queryText, queryParams);

  // Filter and sort by radius using Haversine
  const nearby = filterByRadius(latNum, lngNum, resources, radius, 'latitude', 'longitude');
  return nearby;
};

export default {
  updateUserLocation,
  getIncidentLocations,
  getNearbyResources,
};
