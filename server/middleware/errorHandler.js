const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        status: 422,
        details: err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
        status: 401,
      },
    });
  }

  // Body parser errors (malformed JSON, oversized body)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Malformed JSON', status: 400 },
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large', status: 413 },
    });
  }

  // Generic error
  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  logger.error('errorHandler', err.message, isDev ? { stack: err.stack } : undefined);

  res.status(status).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'Something went wrong',
      status,
    },
  });
}

module.exports = errorHandler;
