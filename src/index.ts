import { getConfig } from './config/index.js';
import { logger } from './logging/logger.js';
import { startGatewayServer, type RunningServer } from './gateway/server.js';

let runningServer: RunningServer | null = null;

export async function bootstrap(): Promise<RunningServer | void> {
  try {
    const config = getConfig();

    if (!config.woocommerce.verifySsl) {
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    }

    logger.info(
      {
        env: config.env,
        port: config.port,
        host: config.host,
        wcTarget: config.woocommerce.url,
      },
      'Bootstrapping WooCommerce MCP Gateway...'
    );

    runningServer = await startGatewayServer(config);

    const handleShutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');
      if (runningServer) {
        try {
          await runningServer.stop();
          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    return runningServer;
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start WooCommerce MCP Gateway');
    process.exit(1);
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  bootstrap();
}
