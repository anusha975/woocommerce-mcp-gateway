import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { AppConfig } from '../types/index.js';
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from '../tools/index.js';
import {
  createAuthMiddleware,
  createRateLimitMiddleware,
  requestLoggerMiddleware,
  errorHandlerMiddleware,
} from '../middleware/index.js';
import { logger } from '../logging/logger.js';

export interface GatewayAppInstance {
  app: Express;
  cleanup: () => Promise<void>;
}

export function createGatewayApp(config: AppConfig): GatewayAppInstance {
  const app = express();

  // 1. Conservative CORS configuration
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
      credentials: false, // Never permit credentials with wildcard origins
    })
  );

  // 2. Bounded body size limit to prevent Denial of Service via oversized payloads
  app.use(express.json({ limit: config.security.maxBodySizeBytes }));

  // 3. Request correlation & safe logging
  app.use(requestLoggerMiddleware);

  // 4. Rate limiting protection
  app.use(createRateLimitMiddleware(config.security));

  const authMiddleware = createAuthMiddleware(config);

  // --- Unauthenticated Diagnostic Endpoints (Minimal Safe Payload) ---

  // Liveness check (Kubernetes livenessProbe)
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check (Kubernetes readinessProbe)
  app.get('/readyz', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      service: SERVER_NAME,
      version: SERVER_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // Root info endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      service: SERVER_NAME,
      version: SERVER_VERSION,
      mcpEndpoints: {
        streamableHttp: '/mcp',
        sse: '/sse',
        messages: '/messages',
      },
      authRequired: Boolean(config.gatewayApiKey),
      documentation: 'https://modelcontextprotocol.io',
    });
  });

  // --- Protected MCP Transports ---

  const activeSseTransports = new Map<string, SSEServerTransport>();

  // --- MCP Streamable HTTP Transport (/mcp) ---
  app.all('/mcp', authMiddleware, async (req: Request, res: Response) => {
    try {
      const server = createMcpServer(config);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, errMsg }, 'Error handling Streamable HTTP request');
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to process MCP Streamable request: ${errMsg}` });
      }
    }
  });

  // --- MCP SSE Transport (/sse and /messages) ---
  app.get('/sse', authMiddleware, async (_req: Request, res: Response) => {
    try {
      const sseServer = createMcpServer(config);
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

  // Central Error Handler
  app.use(errorHandlerMiddleware);

  const cleanup = async () => {
    logger.info('Cleaning up active MCP transports and sessions...');
    for (const [id, sseTransport] of activeSseTransports.entries()) {
      try {
        await sseTransport.close();
      } catch (err) {
        logger.warn({ err, sessionId: id }, 'Error closing SSE transport');
      }
    }
    activeSseTransports.clear();
  };

  return { app, cleanup };
}
