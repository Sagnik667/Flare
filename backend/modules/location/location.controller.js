import * as locationService from './location.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import db from '../../config/database.js';
import { ROLES } from '../../utils/constants.js';

export const update = async (req, res) => {
  const { incidentId, latitude, longitude, accuracy } = req.body;
  const data = await locationService.updateUserLocation(req.user.id, {
    incidentId,
    latitude,
    longitude,
    accuracy,
  });
  return ApiResponse.success(res, 'User location updated successfully', data);
};

export const getIncidentLocations = async (req, res) => {
  const { id } = req.params;

  // Controller layer authorization check
  const { rows: incidentRows } = await db.query(
    'SELECT user_id FROM emergency_incidents WHERE id = $1',
    [id]
  );

  if (incidentRows.length === 0) {
    return ApiResponse.error(res, 'Incident not found', null, 404);
  }

  const incident = incidentRows[0];
  let isAuthorized = false;

  if (req.user.role === ROLES.ADMIN) {
    isAuthorized = true;
  } else if (req.user.role === ROLES.WOMAN && incident.user_id === req.user.id) {
    isAuthorized = true;
  } else if (req.user.role === ROLES.VOLUNTEER) {
    const { rows: assignmentRows } = await db.query(
      `SELECT ia.id FROM incident_assignments ia
       JOIN volunteers v ON ia.volunteer_id = v.id
       WHERE ia.incident_id = $1 AND v.user_id = $2`,
      [id, req.user.id]
    );
    if (assignmentRows.length > 0) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return ApiResponse.error(res, 'Access denied: You are not authorized to view location history for this incident', null, 403);
  }

  const data = await locationService.getIncidentLocations(id, req.user.id, req.user.role);
  return ApiResponse.success(res, 'Incident locations retrieved successfully', data);
};

export const getNearbyResources = async (req, res) => {
  const { lat, lng, radius, category } = req.query;
  const radiusKm = radius ? parseFloat(radius) : 5.0;
  
  const data = await locationService.getNearbyResources(lat, lng, {
    radius: radiusKm,
    category,
  });
  
  return ApiResponse.success(res, 'Nearby safety resources retrieved successfully', data);
};

export default {
  update,
  getIncidentLocations,
  getNearbyResources,
};
