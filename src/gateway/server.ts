import type { Server } from 'node:http';
import type { AppConfig } from '../types/index.js';
import { createGatewayApp } from './app.js';
import { logger } from '../logging/logger.js';

export interface RunningServer {
  httpServer: Server;
  stop: () => Promise<void>;
}

export async function startGatewayServer(config: AppConfig): Promise<RunningServer> {
  const { app, cleanup } = createGatewayApp(config);

  return new Promise((resolve, reject) => {
    const httpServer = app.listen(config.port, config.host, () => {
      logger.info(
        {
          host: config.host,
          port: config.port,
          env: config.env,
          mcpStreamableEndpoint: `http://${config.host}:${config.port}/mcp`,
          mcpSseEndpoint: `http://${config.host}:${config.port}/sse`,
        },
        'WooCommerce MCP Gateway server is listening'
      );

      const stop = async (): Promise<void> => {
        logger.info('Initiating graceful shutdown of Gateway HTTP server...');
        await cleanup();
        return new Promise<void>((res, rej) => {
          httpServer.close((err) => {
            if (err) {
              logger.error({ err }, 'Error during HTTP server shutdown');
              return rej(err);
            }
            logger.info('Gateway HTTP server closed successfully');
            res();
          });
        });
      };

      resolve({ httpServer, stop });
    });

    httpServer.on('error', (err) => {
      logger.fatal({ err }, 'Fatal error on Gateway HTTP server');
      reject(err);
    });
  });
}
