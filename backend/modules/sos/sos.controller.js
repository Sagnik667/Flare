import * as sosService from './sos.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import db from '../../config/database.js';
import { ROLES } from '../../utils/constants.js';

export const create = async (req, res) => {
  const { latitude, longitude, address } = req.body;
  const incident = await sosService.createSOS({
    userId: req.user.id,
    latitude,
    longitude,
    address,
  });
  return ApiResponse.success(res, 'SOS Incident registered successfully', incident, 201);
};

export const history = async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const data = await sosService.getIncidentHistory(req.user.id, { page, limit });
  return ApiResponse.paginated(res, 'Incident history retrieved successfully', data.incidents, data.pagination);
};

export const getIncident = async (req, res) => {
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
    return ApiResponse.error(res, 'Access denied: You are not authorized to view this incident', null, 403);
  }

  const data = await sosService.getIncidentDetails(id, req.user.id, req.user.role);
  return ApiResponse.success(res, 'Incident details retrieved successfully', data);
};

export const resolve = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

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
    const { rows: activeAssignment } = await db.query(
      `SELECT ia.id FROM incident_assignments ia
       JOIN volunteers v ON ia.volunteer_id = v.id
       WHERE ia.incident_id = $1 AND v.user_id = $2 AND ia.assignment_status = ANY($3)`,
      [id, req.user.id, ['accepted', 'en_route', 'arrived', 'assisting']]
    );
    if (activeAssignment.length > 0) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return ApiResponse.error(res, 'Access denied: You are not authorized to resolve this incident', null, 403);
  }

  const result = await sosService.resolveIncident(id, req.user.id, req.user.role, notes);
  return ApiResponse.success(res, 'Incident resolved successfully', result);
};

export default {
  create,
  history,
  getIncident,
  resolve,
};
