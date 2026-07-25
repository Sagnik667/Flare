import * as authService from './auth.service.js';
import ApiResponse from '../../utils/apiResponse.js';

const isProd = process.env.NODE_ENV === 'production';
// In production the frontend and backend commonly live on different domains
// (e.g. app.vercel.app + api.onrender.com). A 'lax' cookie is NOT sent on the
// cross-site POST /auth/refresh, silently breaking session restore on reload.
// 'none' (which requires secure/HTTPS) works for both same-site and split-domain.
// Dev keeps 'lax' so cross-port http localhost (5173 -> 5000) still works.
const COOKIE_SAMESITE = isProd ? 'none' : 'lax';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: COOKIE_SAMESITE,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: COOKIE_SAMESITE,
};

export const register = async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;
  await authService.registerUser({ fullName, email, phone, password, role });
  
  // Log user in automatically
  const data = await authService.loginUser({ email, password });
  
  // Set HttpOnly Cookie
  res.cookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);

  return ApiResponse.success(res, 'Registration successful', {
    accessToken: data.accessToken,
    user: data.user,
  }, 201);
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.loginUser({ email, password });
  
  // Set HttpOnly Cookie
  res.cookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);

  // Exclude refresh token from JSON body
  return ApiResponse.success(res, 'Login successful', {
    accessToken: data.accessToken,
    user: data.user,
  });
};



export const refresh = async (req, res) => {
  // Read from cookie first, fallback to body
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return ApiResponse.error(res, 'Refresh token missing', null, 401);
  }

  const data = await authService.refreshSession(refreshToken);
  
  // Rotate cookie with new refresh token
  res.cookie('refreshToken', data.refreshToken, COOKIE_OPTIONS);

  // Exclude refresh token from JSON body
  return ApiResponse.success(res, 'Tokens refreshed successfully', {
    accessToken: data.accessToken,
  });
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  
  if (refreshToken) {
    await authService.logoutSession(refreshToken);
  }

  // Clear HttpOnly Cookie
  res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
  
  return ApiResponse.success(res, 'Logout successful');
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  return ApiResponse.success(res, 'If an account exists, a reset email has been sent');
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  return ApiResponse.success(res, 'Password reset successful. You can now log in.');
};

export const getDevAdminCredentials = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return ApiResponse.error(res, 'Not found', null, 404);
  }

  const credentials = await authService.getDevAdminCredentials();
  if (!credentials) {
    return ApiResponse.error(res, 'No default admin credentials configured or user not found', null, 404);
  }

  return ApiResponse.success(res, 'Dev admin credentials retrieved successfully', credentials);
};

export default {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getDevAdminCredentials,
};
