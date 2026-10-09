import { z } from 'zod';
import { ConfigurationError } from '../errors/index.js';
import type { AppConfig } from '../types/index.js';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z
      .string()
      .default('3000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(65535)),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    GATEWAY_API_KEY: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z
      .string()
      .default('60000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1000, 'RATE_LIMIT_WINDOW_MS must be at least 1000ms')),
    RATE_LIMIT_MAX_REQUESTS: z
      .string()
      .default('100')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1, 'RATE_LIMIT_MAX_REQUESTS must be at least 1')),
    CORS_ALLOWED_ORIGINS: z
      .string()
      .default('')
      .transform((val) =>
        val
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      ),
    MAX_REQUEST_BODY_BYTES: z
      .string()
      .default('1048576') // 1MB
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1024).max(52428800)),
    WOOCOMMERCE_BASE_URL: z.string().optional(),
    WOOCOMMERCE_URL: z.string().optional(),
    WOOCOMMERCE_CONSUMER_KEY: z
      .string()
      .min(1, 'WOOCOMMERCE_CONSUMER_KEY is required'),
    WOOCOMMERCE_CONSUMER_SECRET: z
      .string()
      .min(1, 'WOOCOMMERCE_CONSUMER_SECRET is required'),
    WOOCOMMERCE_TIMEOUT_MS: z
      .string()
      .default('10000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1000, 'WOOCOMMERCE_TIMEOUT_MS must be at least 1000ms')),
    WOOCOMMERCE_VERIFY_SSL: z
      .string()
      .default('true')
      .transform((val) => val === 'true' || val === '1'),
  })
  .superRefine((data, ctx) => {
    const rawUrl = data.WOOCOMMERCE_BASE_URL || data.WOOCOMMERCE_URL;
    if (!rawUrl || rawUrl.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WOOCOMMERCE_BASE_URL'],
        message: 'WOOCOMMERCE_BASE_URL (or WOOCOMMERCE_URL) is required',
      });
      return;
    }

    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WOOCOMMERCE_BASE_URL'],
          message: 'Target store URL must use HTTP or HTTPS protocol',
        });
        return;
      }

      const isLocalhost =
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1' ||
        parsedUrl.hostname === '::1' ||
        parsedUrl.hostname.endsWith('.local') ||
        parsedUrl.hostname.endsWith('.test');

      if (parsedUrl.protocol === 'http:' && !isLocalhost && data.NODE_ENV === 'production') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WOOCOMMERCE_BASE_URL'],
          message:
            'HTTPS is strictly required for remote WooCommerce endpoints in production. HTTP is only permitted for localhost or development/test environments.',
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WOOCOMMERCE_BASE_URL'],
        message: 'WOOCOMMERCE_BASE_URL must be a valid URL (e.g. https://your-store.example.com)',
      });
    }
  });

export type RawEnvironment = z.infer<typeof envSchema>;

export function validateEnvironment(env: Record<string, string | undefined>): AppConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => ` - [${issue.path.join('.') || 'root'}]: ${issue.message}`)
      .join('\n');

    throw new ConfigurationError(
      `Invalid application configuration:\n${formattedErrors}`,
      result.error.flatten().fieldErrors
    );
  }

  const { data } = result;
  const rawUrl = (data.WOOCOMMERCE_BASE_URL || data.WOOCOMMERCE_URL || '').replace(/\/+$/, '');
  const apiKey = data.GATEWAY_API_KEY?.trim() || undefined;

  return {
    env: data.NODE_ENV,
    port: data.PORT,
    host: data.HOST,
    logLevel: data.LOG_LEVEL,
    gatewayApiKey: apiKey,
    security: {
      gatewayApiKey: apiKey,
      rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: data.RATE_LIMIT_MAX_REQUESTS,
      corsAllowedOrigins: data.CORS_ALLOWED_ORIGINS,
      maxBodySizeBytes: data.MAX_REQUEST_BODY_BYTES,
    },
    woocommerce: {
      url: rawUrl,
      consumerKey: data.WOOCOMMERCE_CONSUMER_KEY,
      consumerSecret: data.WOOCOMMERCE_CONSUMER_SECRET,
      timeoutMs: data.WOOCOMMERCE_TIMEOUT_MS,
      verifySsl: data.WOOCOMMERCE_VERIFY_SSL,
    },
  };
}
