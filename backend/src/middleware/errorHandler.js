import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.name === 'MulterError') {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      success: false,
      error: tooLarge ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
      message: tooLarge ? 'Image must be 2 MB or smaller' : err.message,
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_JSON',
      message: 'Request body is not valid JSON',
    });
  }

  // число или дата вне допустимого диапазона базы данных
  if (err.code === '22003' || err.code === '22007' || err.code === '22008') {
    return res.status(400).json({
      success: false,
      error: 'VALUE_OUT_OF_RANGE',
      message: 'A number or date is outside the allowed range',
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'CONFLICT',
      message: 'Resource already exists',
    });
  }

  if (err.code === '23514' || err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'CONSTRAINT_VIOLATION',
      message: 'Data violates a database constraint',
    });
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
}