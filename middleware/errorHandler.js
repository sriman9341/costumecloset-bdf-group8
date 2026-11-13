/**
 * Error Handling Middleware
 * CostumeCloset – Theatre Costume Hire Management System
 * Team Lead Contribution: B. Uday Sai Sriman
 */

const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err.stack || err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode
    }
  });
};

module.exports = errorHandler;

