import { describe, it, expect, vi } from 'vitest';
import { WooCommerceClient } from '../../src/connectors/woocommerce.client.js';
import { createMcpServer } from '../../src/tools/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { AppConfig } from '../../src/types/index.js';
import { mockRawProductsList, mockRawOrderDetail } from '../fixtures/woocommerce.fixtures.js';

describe('Concurrency & Reliability Tests', () => {
  const mockConfig: AppConfig = {
    env: 'test',
    port: 3000,
    host: '0.0.0.0',
    logLevel: 'silent',
    security: {
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 1000,
      corsAllowedOrigins: [],
      maxBodySizeBytes: 1048576,
    },
    woocommerce: {
      url: 'https://store.example.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      timeoutMs: 5000,
      verifySsl: true,
    },
  };

  it('should handle multiple concurrent tool invocations without race conditions', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      // Simulate minor network jitter
      await new Promise((r) => setTimeout(r, 10));

      if (url.includes('/orders/')) {
        return new Response(JSON.stringify(mockRawOrderDetail), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(mockRawProductsList), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-wp-total': '2',
          'x-wp-totalpages': '1',
        },
      });
    });

    const wcClient = new WooCommerceClient({
      baseUrl: mockConfig.woocommerce.url,
      consumerKey: mockConfig.woocommerce.consumerKey,
      consumerSecret: mockConfig.woocommerce.consumerSecret,
      fetchFn: mockFetch,
    });

    const server = createMcpServer(mockConfig, wcClient);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'concurrency-tester', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    // Dispatch 20 concurrent tool calls
    const calls = Array.from({ length: 20 }, (_, idx) => {
      if (idx % 2 === 0) {
        return client.callTool({
          name: 'list_products',
          arguments: { page: 1, per_page: 5 },
        });
      } else {
        return client.callTool({
          name: 'get_order',
          arguments: { id: 2001 },
        });
      }
    });

    const results = await Promise.all(calls);
    expect(results.length).toBe(20);

    for (const res of results) {
      expect(res.isError).toBeFalsy();
      expect(res.content).toBeDefined();
    }

    await client.close();
    await server.close();
  });
});
