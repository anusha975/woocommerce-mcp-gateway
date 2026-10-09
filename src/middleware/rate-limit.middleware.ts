import type { Request, Response, NextFunction } from 'express';
import type { SecurityConfig } from '../types/index.js';
import { logger } from '../logging/logger.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiting middleware.
 *
 * NOTE FOR DISTRIBUTED / MULTI-REPLICA DEPLOYMENTS:
 * This rate limiter stores request counts in process memory.
 * When running multiple Kubernetes pod replicas, rate limits are enforced
 * per-pod rather than globally across the cluster. For strictly synchronized
 * cluster-wide limits across multiple replicas, back this with a Redis store.
 */
export function createRateLimitMiddleware(config: SecurityConfig) {
  const ipStore = new Map<string, RateLimitRecord>();
  const { rateLimitWindowMs, rateLimitMaxRequests } = config;

  // Periodic cleanup of stale IP records every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(key);
      }
    }
  }, 300000);

  // Prevent interval from holding the Node process open
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Health checks and readiness endpoints bypass rate limiting to prevent false-positive k8s probe failures
    if (req.path === '/healthz' || req.path === '/readyz') {
      return next();
    }

    const clientKey = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    let record = ipStore.get(clientKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + rateLimitWindowMs,
      };
      ipStore.set(clientKey, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, rateLimitMaxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', rateLimitMaxRequests);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > rateLimitMaxRequests) {
      res.setHeader('Retry-After', resetSeconds);
      logger.warn(
        { clientKey, count: record.count, limit: rateLimitMaxRequests },
        'Client exceeded gateway rate limit'
      );

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Rate limit of ${rateLimitMaxRequests} requests per ${Math.round(rateLimitWindowMs / 1000)}s exceeded.`,
          retryAfterSeconds: resetSeconds,
        },
      });
      return;
    }

    next();
  };
}
