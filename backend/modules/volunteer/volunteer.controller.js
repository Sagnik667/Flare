import * as volunteerService from './volunteer.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import fs from 'fs';

export const register = async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, 'ID Document file upload is required', null, 400);
  }

  const { address, serviceRadiusKm, age, governmentIdType, governmentIdNumber, fullName, latitude, longitude } = req.body;
  const documentUrl = `/uploads/${req.file.filename}`;

  try {
    const profile = await volunteerService.registerVolunteer(req.user.id, {
      address,
      serviceRadiusKm,
      documentUrl,
      age,
      governmentIdType,
      governmentIdNumber,
      fullName,
      latitude,
      longitude,
      filePath: req.file.path, // Pass actual path for file signature check and transaction rollback deletion
    });

    return ApiResponse.success(res, 'Volunteer profile registration submitted successfully', profile, 201);
  } catch (error) {
    // Delete file immediately on error to avoid orphan files
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to delete uploaded file after registration error:', unlinkErr);
      }
    }
    // Propagate exact error message
    return ApiResponse.error(res, error.message || 'Failed to submit application', null, error.status || 400);
  }
};

export const getProfile = async (req, res) => {
  const profile = await volunteerService.getVolunteerProfile(req.user.id);
  return ApiResponse.success(res, 'Volunteer profile retrieved successfully', profile);
};

export const updateAvailability = async (req, res) => {
  const { isAvailable } = req.body;
  const profile = await volunteerService.updateAvailability(req.user.id, isAvailable);
  return ApiResponse.success(res, 'Volunteer availability updated successfully', profile);
};

export const getAlerts = async (req, res) => {
  const alerts = await volunteerService.getActiveAlerts(req.user.id);
  return ApiResponse.success(res, 'Active alerts retrieved successfully', alerts);
};

export const accept = async (req, res) => {
  const { incidentId } = req.body;
  const result = await volunteerService.acceptIncident(req.user.id, incidentId);
  return ApiResponse.success(res, 'Emergency incident accepted successfully', result);
};

export const updateStatus = async (req, res) => {
  const { incidentId, status } = req.body;
  const result = await volunteerService.updateResponseStatus(req.user.id, incidentId, status);
  return ApiResponse.success(res, 'Response status updated successfully', result);
};

// Volunteer Resource Management handlers
import * as volunteerResourcesService from './volunteerResources.service.js';

export const getResources = async (req, res) => {
  const result = await volunteerResourcesService.getVolunteerResources(req.user.id);
  return ApiResponse.success(res, 'Safety resources retrieved successfully', result);
};

export const recommendResource = async (req, res) => {
  const result = await volunteerResourcesService.recommendResource(req.user.id, req.body);
  return ApiResponse.success(res, 'Resource recommendation submitted successfully', result, 201);
};

export const recommendClosure = async (req, res) => {
  const result = await volunteerResourcesService.recommendClosure(req.user.id, req.body);
  return ApiResponse.success(res, 'Closure recommendation submitted successfully', result, 201);
};

export const declareEmergency = async (req, res) => {
  const { id } = req.params;
  const result = await volunteerResourcesService.declareEmergency(req.user.id, id);
  return ApiResponse.success(res, 'Emergency declared successfully and nearby resources auto-notified', result);
};

export default {
  register,
  getProfile,
  updateAvailability,
  getAlerts,
  accept,
  updateStatus,
  getResources,
  recommendResource,
  recommendClosure,
  declareEmergency,
};
