import pino from 'pino';
import type { LogLevel } from '../types/index.js';

export const SENSITIVE_KEYS = [
  'WOOCOMMERCE_CONSUMER_SECRET',
  'WOOCOMMERCE_CONSUMER_KEY',
  'GATEWAY_API_KEY',
  'consumer_secret',
  'consumer_key',
  'authorization',
  'Authorization',
  'password',
  'token',
  'secret',
  'apiKey',
  'apiKeySecret',
  'cookie',
  'set-cookie',
];

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'consumer_secret',
  'consumer_key',
  'consumerSecret',
  'consumerKey',
  'password',
  'token',
  'secret',
  'gatewayApiKey',
  'woocommerce.consumerKey',
  'woocommerce.consumerSecret',
  '*.consumer_secret',
  '*.consumer_key',
  '*.consumerSecret',
  '*.consumerKey',
  '*.password',
  '*.token',
  '*.secret',
  '*.authorization',
];

/**
 * Redacts known sensitive fields from generic objects or primitives
 */
export function sanitizeObject<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()))
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized as T;
  }

  return data;
}

export function createLogger(options: {
  level?: LogLevel;
  pretty?: boolean;
  name?: string;
} = {}) {
  const { level = 'info', pretty = false, name = 'wc-mcp-gateway' } = options;

  return pino({
    name,
    level,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    transport: pretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

// Default application logger instance
export const logger = createLogger({
  level: (process.env['LOG_LEVEL'] as LogLevel) || 'info',
  pretty: process.env['NODE_ENV'] === 'development',
});
