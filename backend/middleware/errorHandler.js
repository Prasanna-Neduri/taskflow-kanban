/**
 * Centralized Error Handling Middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log full stack trace in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error encountered:', err);
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid ID format: '${err.value}'`;
    return res.status(400).json({
      success: false,
      message
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value entered for ${field}. Please use a unique value.`;
    return res.status(409).json({
      success: false,
      message
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. '),
      errors: messages
    });
  }

  // JSON parse error (e.g., malformed body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload received'
    });
  }

  // Default server error
  const statusCode = error.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
