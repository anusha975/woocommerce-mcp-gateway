import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../../src/tools/index.js';
import { WooCommerceClient } from '../../src/connectors/woocommerce.client.js';
import type { AppConfig } from '../../src/types/index.js';
import {
  mockRawOrdersList,
  mockRawOrderDetail,
} from '../fixtures/woocommerce.fixtures.js';

describe('MCP Order Tools Integration Tests', () => {
  const mockConfig: AppConfig = {
    env: 'test',
    port: 3000,
    host: '0.0.0.0',
    logLevel: 'info',
    security: {
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
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

  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;
  let mcpServer: ReturnType<typeof createMcpServer>;

  const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes('/wp-json/wc/v3/orders/2001') && init?.method === 'PUT') {
      const body = JSON.parse((init.body as string) || '{}');
      return new Response(JSON.stringify({ id: 2001, status: body.status || 'completed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/wp-json/wc/v3/orders/50000') && init?.method === 'PUT') {
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (url.includes('/wp-json/wc/v3/orders/2001')) {
      return new Response(JSON.stringify(mockRawOrderDetail), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/wp-json/wc/v3/orders/99999')) {
      return new Response(JSON.stringify({ code: 'not_found', message: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/wp-json/wc/v3/orders')) {
      return new Response(JSON.stringify(mockRawOrdersList), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-wp-total': '1',
          'x-wp-totalpages': '1',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  });

  beforeAll(async () => {
    const wcClient = new WooCommerceClient({
      baseUrl: mockConfig.woocommerce.url,
      consumerKey: mockConfig.woocommerce.consumerKey,
      consumerSecret: mockConfig.woocommerce.consumerSecret,
      fetchFn: mockFetch,
    });

    mcpServer = createMcpServer(mockConfig, wcClient);
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client(
      {
        name: 'test-order-tools-client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
    await mcpServer.close();
  });

  it('should discover all registered order tools', async () => {
    const response = await client.listTools();
    const toolNames = response.tools.map((t) => t.name);

    expect(toolNames).toContain('list_recent_orders');
    expect(toolNames).toContain('get_order');
    expect(toolNames).toContain('search_orders_by_status');
    expect(toolNames).toContain('get_order_summary');
    expect(toolNames).toContain('update_order_status');

    const updateTool = response.tools.find((t) => t.name === 'update_order_status');
    expect(updateTool).toBeDefined();
    expect(updateTool?.inputSchema).toBeDefined();
  });

  it('should invoke list_recent_orders with pagination and date filter', async () => {
    const result = await client.callTool({
      name: 'list_recent_orders',
      arguments: {
        page: 1,
        per_page: 5,
        after: '2026-10-01T00:00:00Z',
      },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content.length).toBe(1);

    const parsed = JSON.parse(content[0]?.text ?? '{}');
    expect(parsed.items).toBeDefined();
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].id).toBe(2001);
    expect(parsed.items[0].total).toBe('234.49');
  });

  it('should invoke search_orders_by_status and filter by supported status', async () => {
    const result = await client.callTool({
      name: 'search_orders_by_status',
      arguments: { status: 'processing' },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0]?.text ?? '{}');

    expect(parsed.statusFilter).toBe('processing');
    expect(parsed.orders.length).toBe(1);
    expect(parsed.orders[0].status).toBe('processing');
  });

  it('should invoke get_order by ID without leaking customer PII or card secrets', async () => {
    const result = await client.callTool({
      name: 'get_order',
      arguments: { id: 2001 },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const order = JSON.parse(content[0]?.text ?? '{}');

    expect(order.id).toBe(2001);
    expect(order.lineItems.length).toBe(1);
    expect(order.lineItems[0].name).toBe('Classic Leather Jacket');
    expect(order.customer.city).toBe('Seattle');

    // Verify raw email, phone, street address are not present
    const rawOutput = content[0]?.text ?? '';
    expect(rawOutput).not.toContain('jane.doe@example-sensitive.com');
    expect(rawOutput).not.toContain('555-0199');
    expect(rawOutput).not.toContain('123 Confidential Way');
  });

  it('should invoke get_order_summary and return high-level financial & line item summary', async () => {
    const result = await client.callTool({
      name: 'get_order_summary',
      arguments: { id: 2001 },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const summary = JSON.parse(content[0]?.text ?? '{}');

    expect(summary.id).toBe(2001);
    expect(summary.status).toBe('processing');
    expect(summary.total).toBe('234.49');
    expect(summary.currency).toBe('USD');
    expect(summary.itemCount).toBe(1);
    expect(summary.items[0].name).toBe('Classic Leather Jacket');
  });

  it('should return safe error response for nonexistent order ID', async () => {
    const result = await client.callTool({
      name: 'get_order',
      arguments: { id: 99999 },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('not found');
  });

  it('should reject unsupported status filter with schema validation error', async () => {
    const result = await client.callTool({
      name: 'search_orders_by_status',
      arguments: { status: 'invalid_status_xyz' as unknown as 'processing' },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('Invalid arguments');
  });

  it('should successfully invoke update_order_status and return updated status', async () => {
    const result = await client.callTool({
      name: 'update_order_status',
      arguments: {
        id: 2001,
        status: 'completed',
      },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content.length).toBe(1);

    const updated = JSON.parse(content[0]?.text ?? '{}');
    expect(updated.id).toBe(2001);
    expect(updated.status).toBe('completed');
  });

  it('should reject update_order_status with invalid status', async () => {
    const result = await client.callTool({
      name: 'update_order_status',
      arguments: {
        id: 2001,
        status: 'dispatched' as unknown as 'completed',
      },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('Invalid arguments');
  });

  it('should return safe error when updating a nonexistent order', async () => {
    const result = await client.callTool({
      name: 'update_order_status',
      arguments: {
        id: 99999,
        status: 'cancelled',
      },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('not found');
  });

  it('should return safe error on upstream failure without leaking credentials', async () => {
    const result = await client.callTool({
      name: 'update_order_status',
      arguments: {
        id: 50000,
        status: 'refunded',
      },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('server error (HTTP 500)');
    expect(content[0]?.text).not.toContain('cs_test');
    expect(content[0]?.text).not.toContain('ck_test');
  });
});
