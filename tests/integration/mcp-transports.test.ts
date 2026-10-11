import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startGatewayServer, type RunningServer } from '../../src/gateway/server.js';
import type { AppConfig } from '../../src/types/index.js';

describe('MCP Transports: Streamable HTTP and Legacy SSE Compliance', () => {
  const testPort = 3989;
  const testApiKey = 'mcp-transport-test-key-123';
  const testConfig: AppConfig = {
    env: 'test',
    port: testPort,
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
      url: 'https://store.example.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
      timeoutMs: 5000,
      verifySsl: true,
    },
  };

  let serverInstance: RunningServer;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  beforeAll(async () => {
    serverInstance = await startGatewayServer(testConfig);
  });

  afterAll(async () => {
    if (serverInstance) {
      await serverInstance.stop();
    }
  });

  // --- 1. Streamable HTTP Transport Tests ---
  describe('Streamable HTTP Transport (/mcp)', () => {
    it('should return 406 Not Acceptable when GET /mcp is requested without text/event-stream Accept header', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testApiKey}`,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      expect(res.status).toBe(406);
      const body = (await res.json()) as { error: { code: number; message: string } };
      expect(body.error.code).toBe(-32000);
      expect(body.error.message).toBe('Not Acceptable: Client must accept text/event-stream');
    });

    it('should return 406 Not Acceptable when POST /mcp is requested without both application/json and text/event-stream Accept headers', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testApiKey}`,
          Accept: 'application/json', // Missing text/event-stream
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        }),
      });

      expect(res.status).toBe(406);
      const body = (await res.json()) as { error: { code: number; message: string } };
      expect(body.error.code).toBe(-32000);
      expect(body.error.message).toBe('Not Acceptable: Client must accept both application/json and text/event-stream');
    });

    it('should complete full MCP lifecycle (initialize, tools/list, tools/call) using official StreamableHTTPClientTransport', async () => {
      const client = new Client(
        { name: 'streamable-test-client', version: '1.0.0' },
        { capabilities: {} }
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(`${baseUrl}/mcp`),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${testApiKey}`,
            },
          },
        }
      );

      await client.connect(transport);

      // 1. Initialize verification
      expect(client.getServerVersion()?.name).toBe('woocommerce-mcp-gateway');

      // 2. tools/list verification
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThanOrEqual(9);
      expect(tools.tools.map((t) => t.name)).toContain('health_check');

      // 3. tools/call verification
      const callResult = await client.callTool({
        name: 'health_check',
        arguments: {},
      });
      expect(callResult.content).toBeDefined();
      expect(callResult.isError).toBeFalsy();

      await client.close();
    });

    it('should support stateful session lifecycle (initialize, session reuse, DELETE termination, and 404 on expired session)', async () => {
      // 1. Initialize creates session and returns Mcp-Session-Id header
      const initRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'init-session-1',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-lifecycle-client', version: '1.0.0' },
          },
        }),
      });

      expect(initRes.status).toBe(200);
      const sessionId = initRes.headers.get('mcp-session-id');
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId!.length).toBeGreaterThan(10);

      // 2. Reuse session for subsequent tools/list request
      const listRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${testApiKey}`,
          'Mcp-Session-Id': sessionId!,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'list-1',
          method: 'tools/list',
          params: {},
        }),
      });

      expect(listRes.status).toBe(200);

      // 3. Request with unknown session ID returns 404
      const unknownRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${testApiKey}`,
          'Mcp-Session-Id': 'non-existent-session-uuid-999',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'unknown-1',
          method: 'tools/list',
          params: {},
        }),
      });

      expect(unknownRes.status).toBe(404);
      const unknownBody = (await unknownRes.json()) as { error: { code: number; message: string } };
      expect(unknownBody.error.code).toBe(-32001);
      expect(unknownBody.error.message).toContain('Session not found');

      // 4. Terminate session via DELETE /mcp
      const deleteRes = await fetch(`${baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${testApiKey}`,
          'Mcp-Session-Id': sessionId!,
        },
      });

      expect(deleteRes.status).toBe(200);

      // 5. Subsequent request with terminated session ID returns 404
      const postDeleteRes = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${testApiKey}`,
          'Mcp-Session-Id': sessionId!,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'post-delete-1',
          method: 'tools/list',
          params: {},
        }),
      });

      expect(postDeleteRes.status).toBe(404);
    });
  });

  // --- 2. Legacy SSE Transport Tests ---
  describe('Legacy SSE Transport (/sse and /messages)', () => {
    it('should return 400 when POST /messages is called without sessionId query parameter', async () => {
      const res = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('Missing required sessionId');
    });

    it('should return 404 when POST /messages is called with an invalid sessionId', async () => {
      const res = await fetch(`${baseUrl}/messages?sessionId=non-existent-session-uuid-999`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('Session not found');
    });

    it('should complete full MCP lifecycle (initialize, tools/list, tools/call) using official SSEClientTransport', async () => {
      const sseClient = new Client(
        { name: 'sse-test-client', version: '1.0.0' },
        { capabilities: {} }
      );

      const sseTransport = new SSEClientTransport(
        new URL(`${baseUrl}/sse`),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${testApiKey}`,
            },
          },
        }
      );

      await sseClient.connect(sseTransport);

      // 1. Initialize capability negotiation
      expect(sseClient.getServerVersion()?.name).toBe('woocommerce-mcp-gateway');

      // 2. tools/list verification over SSE
      const tools = await sseClient.listTools();
      expect(tools.tools.length).toBeGreaterThanOrEqual(9);
      expect(tools.tools.map((t) => t.name)).toContain('health_check');

      // 3. tools/call verification over SSE
      const callResult = await sseClient.callTool({
        name: 'health_check',
        arguments: { verbose: true },
      });
      expect(callResult.content).toBeDefined();
      const contentArray = callResult.content as Array<{ type: string; text: string }>;
      const firstContent = contentArray[0]!;
      const parsed = JSON.parse(firstContent.text) as { status: string; service: string };
      expect(parsed.status).toBe('healthy');
      expect(parsed.service).toBe('woocommerce-mcp-gateway');

      await sseClient.close();
    });
  });
});
