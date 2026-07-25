import * as usersService from './users.service.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getProfile = async (req, res) => {
  const profile = await usersService.getProfile(req.user.id);
  return ApiResponse.success(res, 'User profile retrieved successfully', profile);
};

export const updateProfile = async (req, res) => {
  const { fullName, phone } = req.body;
  const user = await usersService.updateProfile(req.user.id, { fullName, phone });
  return ApiResponse.success(res, 'Profile updated successfully', user);
};

export const getSafetyProfile = async (req, res) => {
  const safety = await usersService.getSafetyProfile(req.user.id);
  return ApiResponse.success(res, 'Safety profile retrieved successfully', safety);
};

export const updateSafetyProfile = async (req, res) => {
  const { bloodGroup, medicalNotes, emergencyInstructions, preferredLanguage } = req.body;
  const safety = await usersService.updateSafetyProfile(req.user.id, {
    bloodGroup,
    medicalNotes,
    emergencyInstructions,
    preferredLanguage,
  });
  return ApiResponse.success(res, 'Safety profile updated successfully', safety);
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await usersService.changePassword(req.user.id, currentPassword, newPassword);
  return ApiResponse.success(res, 'Password changed successfully. Please log in again.');
};

export default {
  getProfile,
  updateProfile,
  getSafetyProfile,
  updateSafetyProfile,
  changePassword,
};
