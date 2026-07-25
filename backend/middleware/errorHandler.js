import logger from '../config/logger.js';
import ApiResponse from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  // Log the error details
  logger.error('API Error: ', err);

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // Expose full error stack in development, hide in production
  const details = process.env.NODE_ENV === 'development' ? err.stack : null;

  return ApiResponse.error(res, message, details, statusCode);
};

export default errorHandler;
