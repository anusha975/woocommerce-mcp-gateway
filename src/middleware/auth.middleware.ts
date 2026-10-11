import type { Request, Response, NextFunction } from 'express';
import type { AppConfig, User, ApiKeyRecord, UserRole } from '../types/index.js';
import type { AuthService } from '../services/auth.service.js';
import { logger } from '../logging/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  apiKey?: ApiKeyRecord;
}

/**
 * Validates gateway client authentication for remote MCP endpoints and management APIs.
 * Supports standard HTTP Bearer token authorization and X-API-Key header.
 *
 * Checks:
 * 1. User API keys against SHA-256 hashed storage in AuthService (handles admin/member roles & revocation).
 * 2. Backward-compatible fallback against configured GATEWAY_API_KEY (maps to system admin).
 */
export function createAuthMiddleware(config: AppConfig, authService?: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If no gateway API key and no auth service is configured, access is open (e.g. initial dev mode)
    if (!config.gatewayApiKey && !authService) {
      (req as AuthenticatedRequest).user = {
        id: 'usr_dev_open',
        username: 'dev_user',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      return next();
    }

    // Extract Bearer token from Authorization header
    const authHeader = req.headers['authorization'];
    let providedToken: string | undefined;

    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        providedToken = match[1]?.trim();
      }
    }

    // Fallback: Check X-API-Key header
    if (!providedToken) {
      const apiKeyHeader = req.headers['x-api-key'];
      if (typeof apiKeyHeader === 'string') {
        providedToken = apiKeyHeader.trim();
      }
    }

    if (!providedToken) {
      logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized request: missing authentication header');
      res.setHeader('WWW-Authenticate', 'Bearer');
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing gateway authentication credentials. Expected: Authorization: Bearer <API_KEY> or X-API-Key header.',
        },
      });
      return;
    }

    // 1. Verify against AuthService hashed keys
    if (authService) {
      const verified = authService.verifyKey(providedToken);
      if (verified) {
        (req as AuthenticatedRequest).user = verified.user;
        (req as AuthenticatedRequest).apiKey = verified.apiKey;
        return next();
      }

      // Check if it's a revoked key specifically to provide clear rejection
      const keyHash = (authService.constructor as typeof AuthService).hashApiKey(providedToken);
      const allKeys = authService.listApiKeys();
      const revokedMatch = allKeys.find((k) => k.keyHash === keyHash && k.revoked);
      if (revokedMatch) {
        logger.warn({ ip: req.ip, path: req.path, keyId: revokedMatch.id }, 'Unauthorized request: revoked API key presented');
        res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token", error_description="The API key has been revoked"');
        res.status(401).json({
          error: {
            code: 'KEY_REVOKED',
            message: 'API key has been revoked. Contact administrator for a replacement.',
          },
        });
        return;
      }
    }

    // 2. Backward-compatible fallback: GATEWAY_API_KEY environment variable
    if (config.gatewayApiKey && providedToken === config.gatewayApiKey) {
      (req as AuthenticatedRequest).user = {
        id: 'usr_admin_env',
        username: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      return next();
    }

    // Mismatched / Invalid token
    logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized request: invalid API token provided');
    res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid gateway API token.',
      },
    });
  };
}

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses the required role (e.g., 'admin').
 */
export function requireRole(allowedRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required for this endpoint.',
        },
      });
      return;
    }

    // Admin has access to everything; members only have access if allowedRole is member
    if (user.role === 'admin' || user.role === allowedRole) {
      return next();
    }

    logger.warn({ userId: user.id, username: user.username, role: user.role, requiredRole: allowedRole }, 'Forbidden: Insufficient privileges');
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Insufficient privileges. This operation requires '${allowedRole}' role. Your role is '${user.role}'.`,
      },
    });
  };
}
