import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
          required: ['status', 'timestamp'],
        },
      },
    },
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/db', async (request, reply) => {
    try {
      const result = await pool.query<{ ok: number }>('SELECT 1 AS ok');
      if (result.rows[0]?.ok !== 1) {
        throw new Error('PG sanity check returned unexpected result');
      }
      return { status: 'ok', database: 'reachable' };
    } catch (err) {
      request.log.error({ err }, 'Database health check failed');
      return reply.status(503).send({
        status: 'degraded',
        database: 'unreachable',
      });
    }
  });
}