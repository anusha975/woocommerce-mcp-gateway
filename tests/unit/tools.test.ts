import { describe, it, expect } from 'vitest';
import { handleHealthCheck } from '../../src/tools/health.tool.js';
import type { AppConfig } from '../../src/types/index.js';

describe('Health Check Tool (Unit)', () => {
  const mockConfig: AppConfig = {
    env: 'test',
    port: 3000,
    host: '0.0.0.0',
    logLevel: 'info',
    gatewayApiKey: 'secret-token-12345',
    security: {
      gatewayApiKey: 'secret-token-12345',
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
      corsAllowedOrigins: [],
      maxBodySizeBytes: 1048576,
    },
    woocommerce: {
      url: 'https://store.example.com',
      consumerKey: 'ck_super_secret_key',
      consumerSecret: 'cs_super_secret_secret',
      timeoutMs: 10000,
      verifySsl: true,
    },
  };

  it('should return a healthy status with safe metadata and no secrets', () => {
    const result = handleHealthCheck(mockConfig);

    expect(result.status).toBe('healthy');
    expect(result.service).toBe('woocommerce-mcp-gateway');
    expect(result.version).toBe('1.0.0');
    expect(result.environment).toBe('test');
    expect(result.upstream.targetUrl).toBe('https://store.example.com');
    expect(result.upstream.configured).toBe(true);

    // Ensure raw secrets are NEVER exposed in the health payload
    const stringified = JSON.stringify(result);
    expect(stringified).not.toContain('ck_super_secret_key');
    expect(stringified).not.toContain('cs_super_secret_secret');
    expect(stringified).not.toContain('secret-token-12345');
  });

  it('should return runtime diagnostic details when verbose is requested', () => {
    const result = handleHealthCheck(mockConfig, { verbose: true });

    expect(result.details).toBeDefined();
    expect(result.details?.nodeVersion).toBe(process.version);
    expect(result.details?.platform).toBe(process.platform);
    expect(typeof result.details?.memoryUsageMb).toBe('number');
  });
});
