import * as adminService from './admin.service.js';
import ApiResponse from '../../utils/apiResponse.js';

export const dashboard = async (req, res) => {
  const stats = await adminService.getDashboardStats();
  return ApiResponse.success(res, 'Dashboard statistics retrieved successfully', stats);
};

export const incidents = async (req, res) => {
  const status = req.query.status || null;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);

  const data = await adminService.getIncidents({ status, page, limit });
  return ApiResponse.paginated(res, 'Incidents retrieved successfully', data.incidents, data.pagination);
};

export const users = async (req, res) => {
  const search = req.query.search || null;
  const role = req.query.role || null;
  const status = req.query.status || null;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);

  const data = await adminService.getUsers({ search, role, status, page, limit });
  return ApiResponse.paginated(res, 'Users list retrieved successfully', data.users, data.pagination);
};

export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await adminService.updateUserStatus(req.user.id, id, status);
  return ApiResponse.success(res, `User status updated to ${status} successfully`);
};

export const pendingVolunteers = async (req, res) => {
  const data = await adminService.getPendingVolunteers();
  return ApiResponse.success(res, 'Pending volunteer applications retrieved successfully', data);
};

export const verifyVolunteer = async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  await adminService.verifyVolunteer(req.user.id, id, action, reason);
  const msg = action === 'verify' ? 'Volunteer application approved successfully' : 'Volunteer application rejected successfully';
  return ApiResponse.success(res, msg);
};

export const getResources = async (req, res) => {
  const data = await adminService.getResources();
  return ApiResponse.success(res, 'Safety resources list retrieved successfully', data);
};

export const createResource = async (req, res) => {
  const resource = await adminService.createResource(req.user.id, req.body);
  return ApiResponse.success(res, 'Safety resource created successfully', resource, 201);
};

export const updateResource = async (req, res) => {
  const { id } = req.params;
  const resource = await adminService.updateResource(req.user.id, id, req.body);
  return ApiResponse.success(res, 'Safety resource updated successfully', resource);
};

export const deleteResource = async (req, res) => {
  const { id } = req.params;
  await adminService.deleteResource(req.user.id, id);
  return ApiResponse.success(res, 'Safety resource deactivated successfully');
};

export const getResourceRecommendations = async (req, res) => {
  const result = await adminService.getResourceRecommendations();
  return ApiResponse.success(res, 'Recommended resources retrieved successfully', result);
};

export const reviewResourceRecommendation = async (req, res) => {
  const { id } = req.params;
  await adminService.reviewResourceRecommendation(req.user.id, id, req.body);
  const msg = req.body.action === 'approve' ? 'Resource recommendation approved successfully' : 'Resource recommendation rejected successfully';
  return ApiResponse.success(res, msg);
};

export const getClosureRecommendations = async (req, res) => {
  const result = await adminService.getClosureRecommendations();
  return ApiResponse.success(res, 'Closure recommendations retrieved successfully', result);
};

export const reviewClosureRecommendation = async (req, res) => {
  const { id } = req.params;
  await adminService.reviewClosureRecommendation(req.user.id, id, req.body);
  const msg = req.body.action === 'approve' ? 'Closure recommendation approved successfully' : 'Closure recommendation rejected successfully';
  return ApiResponse.success(res, msg);
};

export default {
  dashboard,
  incidents,
  users,
  updateUserStatus,
  pendingVolunteers,
  verifyVolunteer,
  getResources,
  createResource,
  updateResource,
  deleteResource,
  getResourceRecommendations,
  reviewResourceRecommendation,
  getClosureRecommendations,
  reviewClosureRecommendation,
};
