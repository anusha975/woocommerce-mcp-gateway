import { describe, it, expect, afterAll } from 'vitest';
import { startGatewayServer, type RunningServer } from '../../src/gateway/server.js';
import type { AppConfig } from '../../src/types/index.js';

describe('Gateway HTTP & Security Controls', () => {
  const testPort = 3987;
  const testApiKey = 'valid-test-token-777';
  const testConfig: AppConfig = {
    env: 'test',
    port: testPort,
    host: '127.0.0.1',
    logLevel: 'silent',
    gatewayApiKey: testApiKey,
    security: {
      gatewayApiKey: testApiKey,
      rateLimitWindowMs: 5000,
      rateLimitMaxRequests: 10,
      corsAllowedOrigins: ['https://allowed-mcp-client.com'],
      maxBodySizeBytes: 10240, // 10KB
    },
    woocommerce: {
      url: 'https://store.example.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      timeoutMs: 5000,
      verifySsl: true,
    },
  };

  let serverInstance: RunningServer;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  afterAll(async () => {
    if (serverInstance) {
      await serverInstance.stop();
    }
  });

  it('should start HTTP server and respond to unauthenticated /healthz probe', async () => {
    serverInstance = await startGatewayServer(testConfig);

    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('should respond to /readyz readiness probe with service information', async () => {
    const res = await fetch(`${baseUrl}/readyz`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      service: string;
      version: string;
    };
    expect(body.status).toBe('ready');
    expect(body.service).toBe('woocommerce-mcp-gateway');
  });

  it('should respond to root endpoint / with discovery metadata', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      service: string;
      version: string;
      mcpEndpoints: Record<string, string>;
      authRequired: boolean;
    };
    expect(body.service).toBe('woocommerce-mcp-gateway');
    expect(body.mcpEndpoints.streamableHttp).toBe('/mcp');
    expect(body.authRequired).toBe(true);
  });

  it('should return 404 for nonexistent routes', async () => {
    const res = await fetch(`${baseUrl}/nonexistent-route-999`);
    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should reject unauthorized requests to /mcp when missing or invalid credentials', async () => {
    // Missing auth header
    const resNoAuth = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(resNoAuth.status).toBe(401);
    expect(resNoAuth.headers.get('www-authenticate')).toBe('Bearer');

    // Invalid token
    const resBadAuth = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(resBadAuth.status).toBe(401);
    expect(resBadAuth.headers.get('www-authenticate')).toContain('Bearer');
  });

  it('should accept authorized requests using Bearer token', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'init-1',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }),
    });

    expect(res.status).toBe(200);
  });

  it('should accept authorized requests using X-API-Key header', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'X-API-Key': testApiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'init-2',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client-2', version: '1.0.0' },
        },
      }),
    });

    expect(res.status).toBe(200);
  });

  it('should reject oversized request payloads with 413 Payload Too Large', async () => {
    // Generate oversized string payload (> 10KB configured limit)
    const largePadding = 'x'.repeat(15000);
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', padding: largePadding }),
    });

    expect(res.status).toBe(413);
  });

  it('should enforce rate limiting and set RateLimit headers', async () => {
    const rateLimitConfig: AppConfig = {
      ...testConfig,
      port: 3988,
      security: {
        ...testConfig.security,
        rateLimitMaxRequests: 3,
        rateLimitWindowMs: 5000,
      },
    };

    const rateLimitServer = await startGatewayServer(rateLimitConfig);
    const rateLimitBaseUrl = 'http://127.0.0.1:3988';

    try {
      // Send 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${rateLimitBaseUrl}/`, {
          headers: { Authorization: `Bearer ${testApiKey}` },
        });
        expect(res.status).toBe(200);
        expect(res.headers.get('RateLimit-Limit')).toBe('3');
      }

      // 4th request exceeds rate limit (expect 429)
      const resRateLimited = await fetch(`${rateLimitBaseUrl}/`, {
        headers: { Authorization: `Bearer ${testApiKey}` },
      });
      expect(resRateLimited.status).toBe(429);
      expect(resRateLimited.headers.get('Retry-After')).toBeDefined();

      const body = (await resRateLimited.json()) as { error: { code: string } };
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    } finally {
      await rateLimitServer.stop();
    }
  });
});
