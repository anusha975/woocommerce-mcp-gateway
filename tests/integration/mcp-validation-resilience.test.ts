import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { Server } from 'http';
import { startGatewayServer, type RunningServer } from '../../src/gateway/server.js';
import type { AppConfig } from '../../src/types/index.js';
import {
  mockRawProductsList,
  mockRawProductDetail,
  mockRawOrdersList,
  mockRawOrderDetail,
} from '../fixtures/woocommerce.fixtures.js';

describe('MCP Tools: Input Validation, Error Handling & Protocol Resilience', () => {
  let mockWcServer: Server;
  let mockWcPort: number;
  let gatewayServer: RunningServer;
  let gatewayPort: number;

  const testApiKey = 'mcp_sec_key_resilience_999';
  const testConsumerSecret = 'cs_mock_super_confidential_secret_777';
  const testConsumerKey = 'ck_mock_confidential_key_888';

  beforeAll(async () => {
    const wcApp: Express = express();
    wcApp.use(express.json());

    wcApp.get('/wp-json/wc/v3/products', (_req, res) => {
      res.setHeader('X-WP-Total', '2');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawProductsList);
    });

    wcApp.get('/wp-json/wc/v3/products/:id', (req, res) => {
      const id = Number(req.params.id);
      if (id === 101) {
        res.json(mockRawProductDetail);
      } else if (id === 500) {
        res.status(500).json({ code: 'internal_server_error', message: 'Fatal crash on upstream' });
      } else if (id === 999999) {
        res.status(404).json({ code: 'woocommerce_rest_product_invalid_id', message: 'Product not found.' });
      } else if (id === 777) {
        setTimeout(() => {
          if (!res.headersSent) res.json({ id: 777 });
        }, 1500);
      } else {
        res.status(404).json({ code: 'woocommerce_rest_product_invalid_id', message: 'Not found.' });
      }
    });

    wcApp.get('/wp-json/wc/v3/orders', (_req, res) => {
      res.setHeader('X-WP-Total', '1');
      res.setHeader('X-WP-TotalPages', '1');
      res.json(mockRawOrdersList);
    });

    wcApp.get('/wp-json/wc/v3/orders/:id', (req, res) => {
      const id = Number(req.params.id);
      if (id === 2001) {
        res.json(mockRawOrderDetail);
      } else {
        res.status(404).json({ code: 'woocommerce_rest_order_invalid_id', message: 'Order not found.' });
      }
    });

    mockWcServer = await new Promise((resolve) => {
      const s = wcApp.listen(0, '127.0.0.1', () => resolve(s));
    });
    mockWcPort = (mockWcServer.address() as { port: number }).port;

    gatewayPort = mockWcPort + 30;
    const config: AppConfig = {
      env: 'test',
      port: gatewayPort,
      host: '127.0.0.1',
      logLevel: 'silent',
      gatewayApiKey: testApiKey,
      security: {
        gatewayApiKey: testApiKey,
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 100,
        corsAllowedOrigins: ['*'],
        maxBodySizeBytes: 1048576,
      },
      woocommerce: {
        url: `http://127.0.0.1:${mockWcPort}`,
        consumerKey: testConsumerKey,
        consumerSecret: testConsumerSecret,
        timeoutMs: 400, // Short timeout for testing
        verifySsl: false,
      },
    };

    gatewayServer = await startGatewayServer(config);
  });

  afterAll(async () => {
    if (gatewayServer) {
      await gatewayServer.stop();
    }
    if (mockWcServer) {
      await new Promise<void>((resolve) => mockWcServer.close(() => resolve()));
    }
  });

  async function sendToolCall(name: string, args: Record<string, unknown>) {
    const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `call-${name}`,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });

    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      json = JSON.parse(trimmed) as Record<string, unknown>;
    } else {
      for (const line of trimmed.split('\n')) {
        if (line.startsWith('data: ')) {
          json = JSON.parse(line.substring(6).trim()) as Record<string, unknown>;
          break;
        }
      }
    }
    return { status: res.status, json, text };
  }

  describe('Invalid Input Validations', () => {
    it('health_check rejects non-boolean verbose parameter', async () => {
      const res = await sendToolCall('health_check', { verbose: 'invalid-string' as unknown as boolean });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });

    it('list_products rejects min_price greater than max_price', async () => {
      const res = await sendToolCall('list_products', { min_price: '50.00', max_price: '20.00' });
      const result = res.json?.result as { isError?: boolean; content?: Array<{ text: string }> };
      expect(result.isError).toBe(true);
      expect(result.content?.[0]?.text).toContain('min_price (50) cannot be greater than max_price (20)');
    });

    it('list_products rejects per_page greater than 100', async () => {
      const res = await sendToolCall('list_products', { per_page: 250 });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });

    it('search_products rejects empty search query', async () => {
      const res = await sendToolCall('search_products', { query: '' });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });

    it('get_product rejects negative ID', async () => {
      const res = await sendToolCall('get_product', { id: -1 });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });

    it('get_low_stock_products rejects negative threshold', async () => {
      const res = await sendToolCall('get_low_stock_products', { threshold: -5 });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });

    it('list_recent_orders rejects inverted date range', async () => {
      const res = await sendToolCall('list_recent_orders', { after: '2026-11-01', before: '2026-10-01' });
      const result = res.json?.result as { isError?: boolean; content?: Array<{ text: string }> };
      expect(result.isError).toBe(true);
      expect(result.content?.[0]?.text).toContain('"after" date cannot be later than "before" date');
    });

    it('get_order rejects negative order ID', async () => {
      const res = await sendToolCall('get_order', { id: -10 });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });

    it('search_orders_by_status rejects unsupported status string', async () => {
      const res = await sendToolCall('search_orders_by_status', {
        status: 'invalid_status_xyz' as unknown as 'processing',
      });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });

    it('get_order_summary rejects negative ID', async () => {
      const res = await sendToolCall('get_order_summary', { id: -99 });
      const result = res.json?.result as { isError?: boolean };
      expect(result.isError).toBe(true);
    });
  });

  describe('Upstream Failure & Timeout Sanitization', () => {
    it('handles 404 Not Found without leaking consumer secret', async () => {
      const res = await sendToolCall('get_product', { id: 999999 });
      const result = res.json?.result as { isError?: boolean; content?: Array<{ text: string }> };
      expect(result.isError).toBe(true);
      expect(result.content?.[0]?.text).toContain('not found');
      expect(res.text).not.toContain(testConsumerSecret);
      expect(res.text).not.toContain(testConsumerKey);
    });

    it('handles 500 Internal Server Error without leaking credentials', async () => {
      const res = await sendToolCall('get_product', { id: 500 });
      const result = res.json?.result as { isError?: boolean; content?: Array<{ text: string }> };
      expect(result.isError).toBe(true);
      expect(result.content?.[0]?.text).toContain('server error (HTTP 500)');
      expect(res.text).not.toContain(testConsumerSecret);
      expect(res.text).not.toContain(testConsumerKey);
    });

    it('handles upstream timeout gracefully', async () => {
      const res = await sendToolCall('get_product', { id: 777 });
      const result = res.json?.result as { isError?: boolean; content?: Array<{ text: string }> };
      expect(result.isError).toBe(true);
      expect(result.content?.[0]?.text.toLowerCase()).toContain('timed out');
      expect(res.text).not.toContain(testConsumerSecret);
    });
  });

  describe('Protocol & Content Negotiation Resilience', () => {
    it('returns HTTP 400 for malformed JSON body', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${testApiKey}`,
        },
        body: '{"jsonrpc": 2.0, bad_json',
      });
      expect(res.status).toBe(400);
    });

    it('returns HTTP 401 when gatewayApiKey is configured and Authorization header is missing', async () => {
      // Gateway instance in this test suite is configured with gatewayApiKey: testApiKey.
      // When gatewayApiKey is unset, the gateway operates in open mode (authRequired: false) and does not return 401.
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns HTTP 401 when gatewayApiKey is configured and invalid Bearer token is provided', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': 'Bearer bad_token_123',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns HTTP 406 when Accept header does not support application/json or text/event-stream', async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey}`,
          'Accept': 'text/plain',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(res.status).toBe(406);
    });
  });
});
