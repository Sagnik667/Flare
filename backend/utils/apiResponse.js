export class ApiResponse {
  static success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(res, message, details = null, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  static paginated(res, message, data, pagination, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination: {
        total: parseInt(pagination.total || 0, 10),
        page: parseInt(pagination.page || 1, 10),
        limit: parseInt(pagination.limit || 10, 10),
        pages: parseInt(pagination.pages || 1, 10),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export default ApiResponse;
