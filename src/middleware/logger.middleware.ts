import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger.js';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  const startTime = Date.now();

  // Log incoming request (safe fields only)
  logger.info(
    {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
    'Incoming request'
  );

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      },
      'Request completed'
    );
  });

  next();
}
