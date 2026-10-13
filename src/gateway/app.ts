import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AppConfig, UserRole } from '../types/index.js';
import { SERVER_NAME, SERVER_VERSION } from '../tools/index.js';
import { getInteractiveUiHtml } from './ui.js';
import {
  createAuthMiddleware,
  requireRole,
  type AuthenticatedRequest,
  createRateLimitMiddleware,
  requestLoggerMiddleware,
  errorHandlerMiddleware,
} from '../middleware/index.js';
import { logger } from '../logging/logger.js';
import { JsonStore } from '../storage/store.js';
import { AuthService } from '../services/auth.service.js';
import { AuditService } from '../services/audit.service.js';
import { UpstreamService } from '../services/upstream.service.js';
import { McpAggregator } from './aggregator.js';
import { createAggregatedMcpServer } from './aggregated-server.js';
import { ChatService, type ChatMessage } from '../services/chat.service.js';

export interface GatewayAppInstance {
  app: Express;
  cleanup: () => Promise<void>;
  store: JsonStore;
  authService: AuthService;
  auditService: AuditService;
  upstreamService: UpstreamService;
  aggregator: McpAggregator;
  chatService: ChatService;
}

export function createGatewayApp(config: AppConfig): GatewayAppInstance {
  const app = express();

  // 1. Storage & Domain Services Foundation
  const store = new JsonStore(config.dataDir || './data');
  const authService = new AuthService(store);
  const auditService = new AuditService(store);
  const upstreamService = new UpstreamService(store);
  const aggregator = new McpAggregator(config, upstreamService, auditService);
  const chatService = new ChatService(config, aggregator);

  // Seed default users, hashed keys, and the 3 upstream servers
  authService.seedDefaultUsersAndKeys(config.gatewayApiKey);
  upstreamService.seedDefaultUpstreams(`http://127.0.0.1:${config.port}`, config.env === 'test');

  // 2. CORS configuration
  const corsOrigins = config.security.corsAllowedOrigins;
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (corsOrigins.length === 0 || corsOrigins.includes('*')) {
          return callback(null, true);
        }
        if (corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: false,
    })
  );

  // 3. Body size limit
  app.use(express.json({ limit: config.security.maxBodySizeBytes }));

  // 4. Request correlation & logging
  app.use(requestLoggerMiddleware);

  // 5. Rate limiting protection
  app.use(createRateLimitMiddleware(config.security));

  const authMiddleware = createAuthMiddleware(config, authService);

  // --- Unauthenticated Diagnostic Endpoints ---

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/readyz', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      service: SERVER_NAME,
      version: SERVER_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  app.get('/ui', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(
      getInteractiveUiHtml({
        serviceName: SERVER_NAME,
        version: SERVER_VERSION,
        authRequired: Boolean(config.gatewayApiKey),
      })
    );
  });

  app.get('/', (req: Request, res: Response) => {
    const acceptHeader = req.headers['accept'] || '';
    // If request explicitly asks for HTML (e.g. web browser navigation), redirect to interactive dashboard
    if (acceptHeader.includes('text/html')) {
      res.redirect(302, '/ui');
      return;
    }

    res.status(200).json({
      service: SERVER_NAME,
      version: SERVER_VERSION,
      mcpEndpoints: {
        streamableHttp: '/mcp',
        sse: '/sse',
        messages: '/messages',
      },
      interactiveDashboard: '/ui',
      authRequired: true,
      documentation: 'https://modelcontextprotocol.io',
    });
  });

  // --- Management REST APIs ---

  // Auth Status (Current user & role)
  app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    res.json({
      user: authReq.user,
      apiKey: authReq.apiKey ? { id: authReq.apiKey.id, name: authReq.apiKey.name, prefix: authReq.apiKey.keyPrefix } : undefined,
    });
  });

  // Users Management (Admin only)
  app.get('/api/users', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
    res.json(authService.listUsers());
  });

  app.post('/api/users', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    try {
      const { username, role } = req.body as { username?: string; role?: UserRole };
      if (!username || !role) {
        res.status(400).json({ error: 'username and role (admin|member) are required' });
        return;
      }
      const user = authService.createUser(username, role);
      res.status(201).json(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      res.status(400).json({ error: message });
    }
  });

  // API Key Management (Admin only)
  app.get('/api/keys', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    const userId = req.query['userId'] as string | undefined;
    const keys = authService.listApiKeys(userId).map((k) => ({
      id: k.id,
      userId: k.userId,
      name: k.name,
      keyPrefix: k.keyPrefix,
      revoked: k.revoked,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt,
      // Raw key hash is NEVER sent to the client
    }));
    res.json(keys);
  });

  app.post('/api/keys', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    try {
      const { userId, name } = req.body as { userId?: string; name?: string };
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }
      const result = authService.createApiKey(userId, name || 'API Key');
      // Return rawKey once during creation so the user can copy it
      res.status(201).json({
        id: result.keyRecord.id,
        userId: result.keyRecord.userId,
        name: result.keyRecord.name,
        rawKey: result.rawKey,
        keyPrefix: result.keyRecord.keyPrefix,
        revoked: result.keyRecord.revoked,
        createdAt: result.keyRecord.createdAt,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create API key';
      res.status(400).json({ error: message });
    }
  });

  app.delete('/api/keys/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    const rawId = req.params['id'];
    const keyId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!keyId) {
      res.status(400).json({ error: 'Key ID required' });
      return;
    }
    const revoked = authService.revokeApiKey(keyId);
    if (!revoked) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    res.json({ success: true, message: `API key '${keyId}' revoked successfully` });
  });

  // Upstream Servers Management (Admin only)
  app.get('/api/upstreams', authMiddleware, (_req: Request, res: Response) => {
    res.json(upstreamService.listUpstreams());
  });

  app.post('/api/upstreams', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    try {
      const upstream = upstreamService.registerUpstream(req.body);
      res.status(201).json(upstream);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register upstream server';
      res.status(400).json({ error: message });
    }
  });

  app.patch('/api/upstreams/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    const rawId = req.params['id'];
    const upstreamId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!upstreamId) {
      res.status(400).json({ error: 'Upstream ID required' });
      return;
    }
    try {
      if (typeof req.body.enabled === 'boolean') {
        upstreamService.setUpstreamEnabled(upstreamId, req.body.enabled);
      }
      const updated = upstreamService.updateUpstream(upstreamId, req.body);
      res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update upstream server';
      res.status(400).json({ error: message });
    }
  });

  app.delete('/api/upstreams/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    const rawId = req.params['id'];
    const upstreamId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!upstreamId) {
      res.status(400).json({ error: 'Upstream ID required' });
      return;
    }
    const deleted = upstreamService.deleteUpstream(upstreamId);
    if (!deleted) {
      res.status(404).json({ error: 'Upstream server not found' });
      return;
    }
    res.json({ success: true, message: `Upstream server '${upstreamId}' deleted` });
  });

  app.post('/api/upstreams/:id/health', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
    const rawId = req.params['id'];
    const upstreamId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!upstreamId) {
      res.status(400).json({ error: 'Upstream ID required' });
      return;
    }
    try {
      const health = await upstreamService.checkHealth(upstreamId);
      res.json(health);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Health check failed';
      res.status(400).json({ error: message });
    }
  });

  // Audit Logs (Admin only)
  app.get('/api/audit', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 100;
    const userId = req.query['userId'] as string | undefined;
    const toolName = req.query['toolName'] as string | undefined;
    const logs = auditService.getLogs({ limit, userId, toolName });
    res.json(logs);
  });

  // Tools discovery API (Lists aggregated tools from enabled upstreams)
  app.get('/api/tools', authMiddleware, async (_req: Request, res: Response) => {
    const tools = await aggregator.getAggregatedTools();
    res.json(tools);
  });

  // Chat Agent API (Unified tool calling loop for authenticated users)
  app.post('/api/chat', authMiddleware, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { message, history } = req.body as { message?: string; history?: ChatMessage[] };

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'message string is required' });
        return;
      }

      if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized: User identity required' });
        return;
      }

      const result = await chatService.processChat(message.trim(), history || [], authReq.user);
      res.json(result);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Chat processing error';
      logger.error({ err }, 'Error processing chat query');
      res.status(500).json({ error: errMsg });
    }
  });

  // --- Dedicated Upstream Streamable HTTP MCP Endpoints ---
  app.all('/upstream/:server/mcp', async (req: Request, res: Response) => {
    const rawServer = req.params['server'];
    const serverName = Array.isArray(rawServer) ? rawServer[0] : rawServer;
    const prefixMap: Record<string, string> = {
      woocommerce: 'wc',
      inventory: 'inv',
      support: 'sup',
      wc: 'wc',
      inv: 'inv',
      sup: 'sup',
    };
    const prefix = serverName ? prefixMap[serverName.toLowerCase()] : undefined;
    if (!prefix) {
      res.status(404).json({ error: `Unknown upstream server '${serverName}'` });
      return;
    }

    if (req.method === 'GET') {
      res.status(200).json({
        status: 'ok',
        server: serverName,
        transport: 'streamable-http',
        jsonrpc: '2.0',
      });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.method === 'ping') {
        res.status(200).json({
          jsonrpc: '2.0',
          id: body.id ?? 1,
          result: {},
        });
        return;
      }
      if (body.method === 'initialize') {
        res.status(200).json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: `upstream-${serverName}`,
              version: '1.0.0',
            },
          },
        });
        return;
      }
      if (body.method === 'tools/list') {
        const tools = await aggregator.getRawToolsForPrefix(prefix);
        res.status(200).json({
          jsonrpc: '2.0',
          id: body.id,
          result: { tools },
        });
        return;
      }
      if (body.method === 'tools/call') {
        const toolName = body.params?.name;
        const toolArgs = body.params?.arguments || {};
        try {
          const toolResult = await aggregator.executeRawTool(prefix, toolName, toolArgs);
          res.status(200).json({
            jsonrpc: '2.0',
            id: body.id,
            result: toolResult,
          });
          return;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          res.status(200).json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              isError: true,
              content: [{ type: 'text', text: msg }],
            },
          });
          return;
        }
      }

      res.status(400).json({
        jsonrpc: '2.0',
        id: body.id ?? null,
        error: { code: -32601, message: `Method '${body.method}' not implemented` },
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  });

  // --- Unified MCP Transports ---

  const activeSseTransports = new Map<string, SSEServerTransport>();

  interface StreamableSession {
    transport: StreamableHTTPServerTransport;
    openRequests: number;
    lastActive: number;
  }
  const activeStreamableTransports = new Map<string, StreamableSession>();
  const MAX_STREAMABLE_SESSIONS = 1000;
  const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

  const sessionReaperInterval = setInterval(() => {
    const cutoff = Date.now() - SESSION_IDLE_TIMEOUT_MS;
    for (const [id, session] of activeStreamableTransports.entries()) {
      if (session.openRequests === 0 && session.lastActive < cutoff) {
        session.transport.close().catch((err) => {
          logger.warn({ err, sessionId: id }, 'Error closing idle Streamable transport');
        });
        activeStreamableTransports.delete(id);
      }
    }
  }, 60000);
  sessionReaperInterval.unref();

  // MCP Streamable HTTP Transport (/mcp)
  app.all('/mcp', authMiddleware, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const sessionId = (req.headers['mcp-session-id'] as string | undefined)?.trim();
      const existingSession = sessionId ? activeStreamableTransports.get(sessionId) : undefined;
      let transport: StreamableHTTPServerTransport;

      if (existingSession) {
        transport = existingSession.transport;
        existingSession.openRequests++;
        existingSession.lastActive = Date.now();
        res.on('close', () => {
          existingSession.openRequests = Math.max(0, existingSession.openRequests - 1);
          existingSession.lastActive = Date.now();
        });
      } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
        if (activeStreamableTransports.size >= MAX_STREAMABLE_SESSIONS) {
          res.status(503).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Too many active MCP sessions' },
            id: null,
          });
          return;
        }

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (newSid) => {
            const sessionRecord: StreamableSession = {
              transport,
              openRequests: 1,
              lastActive: Date.now(),
            };
            activeStreamableTransports.set(newSid, sessionRecord);
            res.on('close', () => {
              sessionRecord.openRequests = Math.max(0, sessionRecord.openRequests - 1);
              sessionRecord.lastActive = Date.now();
            });
            logger.info({ sessionId: newSid }, 'Streamable HTTP MCP session initialized');
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && activeStreamableTransports.has(sid)) {
            activeStreamableTransports.delete(sid);
            logger.debug({ sessionId: sid }, 'Streamable HTTP session closed');
          }
        };

        const server = createAggregatedMcpServer(config, aggregator, upstreamService, auditService, currentUser);
        await server.connect(transport);
      } else if (sessionId) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Session not found' },
          id: null,
        });
        return;
      } else {
        const server = createAggregatedMcpServer(config, aggregator, upstreamService, auditService, currentUser);
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        await server.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, errMsg }, 'Error handling Streamable HTTP request');
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to process MCP Streamable request: ${errMsg}` });
      }
    }
  });

  // MCP SSE Transport (/sse and /messages)
  app.get('/sse', authMiddleware, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const sseServer = createAggregatedMcpServer(config, aggregator, upstreamService, auditService, currentUser);
      const sseTransport = new SSEServerTransport('/messages', res);

      const sessionId = sseTransport.sessionId;
      activeSseTransports.set(sessionId, sseTransport);

      sseTransport.onclose = () => {
        activeSseTransports.delete(sessionId);
        logger.debug({ sessionId }, 'SSE client transport closed');
      };

      await sseServer.connect(sseTransport);
      logger.info({ sessionId }, 'New SSE MCP client connected');
    } catch (error) {
      logger.error({ err: error }, 'Error establishing SSE stream');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE stream' });
      }
    }
  });

  app.post('/messages', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.query['sessionId'] as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing required sessionId query parameter' });
      return;
    }

    const transport = activeSseTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `Session not found: ${sessionId}` });
      return;
    }

    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Error handling SSE post message');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process SSE message' });
      }
    }
  });

  // 404 Catch-All
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested route was not found.',
      },
    });
  });

  // 6. Centralized Error Handling Middleware
  app.use(errorHandlerMiddleware);

  return {
    app,
    store,
    authService,
    auditService,
    upstreamService,
    aggregator,
    chatService,
    cleanup: async () => {
      clearInterval(sessionReaperInterval);
      for (const [, session] of activeStreamableTransports.entries()) {
        try {
          await session.transport.close();
        } catch (err) {
          void err;
        }
      }
      activeStreamableTransports.clear();

      for (const [, transport] of activeSseTransports.entries()) {
        try {
          await transport.close();
        } catch (err) {
          void err;
        }
      }
      activeStreamableTransports.clear();
      store.save();
    },
  };
}
