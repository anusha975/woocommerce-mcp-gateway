import type { Request, Response, NextFunction } from 'express';
import type { AppConfig } from '../types/index.js';
import { logger } from '../logging/logger.js';

/**
 * Validates gateway client authentication for remote MCP endpoints.
 * Supports standard HTTP Bearer token authorization and X-API-Key header.
 *
 * NOTE: This is API Token / Bearer Token authorization. It is NOT OAuth 2.0.
 * Upstream WooCommerce credentials (Consumer Key & Secret) are strictly separated
 * from Gateway client credentials (GATEWAY_API_KEY).
 */
export function createAuthMiddleware(config: AppConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If no gateway API key is configured, access is open (e.g., local dev mode)
    if (!config.gatewayApiKey) {
      return next();
    }

    // Check Authorization header first
    const authHeader = req.headers['authorization'];
    let providedToken: string | undefined;

    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        providedToken = match[1]?.trim();
      }
    }

    // Check fallback X-API-Key header
    if (!providedToken) {
      const apiKeyHeader = req.headers['x-api-key'];
      if (typeof apiKeyHeader === 'string') {
        providedToken = apiKeyHeader.trim();
      }
    }

    if (!providedToken) {
      logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized request: missing authentication header');
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing gateway authentication credentials. Expected: Authorization: Bearer <GATEWAY_API_KEY> or X-API-Key header.',
        },
      });
      return;
    }

    if (providedToken !== config.gatewayApiKey) {
      logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized request: invalid API token provided');
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid gateway API token.',
        },
      });
      return;
    }

    next();
  };
}
