import Fastify from 'fastify';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import correlationIdPlugin from './middleware/correlationId.js';
import errorHandlerPlugin from './middleware/errorHandler.js';
import { healthRoutes } from './routes/health.js';
import { accountRoutes } from './routes/accounts.js';
import { contactRoutes } from './routes/contacts.js';
import { syncRoutes } from './routes/sync.js';
import cors from '@fastify/cors';


async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss' },
            }
          : undefined,
    },
    disableRequestLogging: false,
  });

await app.register(cors, {
    origin:
      env.NODE_ENV === 'development'
        ? ['http://localhost:5173']
        : false,
    credentials: true,
    exposedHeaders: ['x-correlation-id'],
  });

  await app.register(correlationIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(accountRoutes);
  await app.register(contactRoutes);
  await app.register(syncRoutes);

  await app.register(healthRoutes);

  return app;
}

async function start() {
  const app = await buildApp();


  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down');
    try {
      await app.close();
      await pool.end();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    await pool.end();
    process.exit(1);
  }
}

void start();