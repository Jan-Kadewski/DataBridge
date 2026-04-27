import type { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  ListSyncLogQuery,
  ListSyncLogResponse,
  SyncMetricsResponse,
} from './schemas.js';
import { getSyncMetrics, listSyncLog } from '../db/queries.js';
import { syncLogFromRow } from '../services/mappers.js';

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<TypeBoxTypeProvider>();

  router.get(
    '/api/sync/logs',
    {
      schema: {
        querystring: ListSyncLogQuery,
        response: { 200: ListSyncLogResponse },
      },
    },
    async (request) => {
      const { limit = 50, offset = 0, correlationId, status } = request.query;
      const { rows, total } = await listSyncLog({
        limit,
        offset,
        correlationId,
        status,
      });
      return {
        data: rows.map(syncLogFromRow),
        total,
        limit,
        offset,
      };
    },
  );

  router.get(
    '/api/sync/metrics',
    {
      schema: {
        response: { 200: SyncMetricsResponse },
      },
    },
    async () => getSyncMetrics(),
  );
}