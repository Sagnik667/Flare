import { validationResult } from 'express-validator';
import ApiResponse from '../utils/apiResponse.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return ApiResponse.error(res, firstError.msg || 'Validation failed', errors.array(), 400);
  }
  next();
};

export default validateRequest;
