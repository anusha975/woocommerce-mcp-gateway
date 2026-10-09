import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { logger } from '../logging/logger.js';

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        details: err.details,
      },
      'Operational error handled'
    );

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  const status =
    (err as { status?: number; statusCode?: number }).status ||
    (err as { status?: number; statusCode?: number }).statusCode;

  if (status && typeof status === 'number' && status >= 400 && status < 600) {
    logger.warn(
      { requestId, status, message: err.message },
      'HTTP client error handled'
    );
    res.status(status).json({
      error: {
        code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
        message: err.message,
        requestId,
      },
    });
    return;
  }

  logger.error(
    {
      requestId,
      err,
    },
    'Unhandled server error'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred.',
      requestId,
    },
  });
}
