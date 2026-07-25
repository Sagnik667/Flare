import * as resourcesService from './resources.service.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getAll = async (req, res) => {
  const { category } = req.query;
  const data = await resourcesService.getResources(category);
  return ApiResponse.success(res, 'Resources retrieved successfully', data);
};

export const getNearby = async (req, res) => {
  const { lat, lng, radius, category } = req.query;
  if (!lat || !lng || lat === 'null' || lng === 'null' || lat === 'undefined' || lng === 'undefined') {
    const data = await resourcesService.getResources(category);
    return ApiResponse.success(res, 'All active safety resources retrieved (GPS unavailable)', data);
  }
  const radiusKm = radius ? parseFloat(radius) : 5.0;
  const data = await resourcesService.getNearby(lat, lng, radiusKm, category);
  return ApiResponse.success(res, 'Nearby resources retrieved successfully', data);
};

export const getById = async (req, res) => {
  const { id } = req.params;
  const data = await resourcesService.getResourceById(id);
  return ApiResponse.success(res, 'Resource details retrieved successfully', data);
};

export default {
  getAll,
  getNearby,
  getById,
};
