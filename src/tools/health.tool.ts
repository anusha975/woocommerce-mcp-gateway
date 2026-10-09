import { z } from 'zod';
import type { AppConfig } from '../types/index.js';

export const healthCheckInputSchema = {
  verbose: z
    .boolean()
    .optional()
    .describe('Include extended system diagnostic details in the status output'),
};

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  upstream: {
    targetUrl: string;
    configured: boolean;
  };
  details?: {
    nodeVersion: string;
    memoryUsageMb: number;
    platform: string;
  };
}

export function handleHealthCheck(
  config: AppConfig,
  args: { verbose?: boolean } = {}
): HealthCheckResponse {
  const memory = process.memoryUsage();

  const response: HealthCheckResponse = {
    status: 'healthy',
    service: 'woocommerce-mcp-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.env,
    upstream: {
      targetUrl: config.woocommerce.url,
      configured: Boolean(
        config.woocommerce.url &&
          config.woocommerce.consumerKey &&
          config.woocommerce.consumerSecret
      ),
    },
  };

  if (args.verbose) {
    response.details = {
      nodeVersion: process.version,
      memoryUsageMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      platform: process.platform,
    };
  }

  return response;
}
