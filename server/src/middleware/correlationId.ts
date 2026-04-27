import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const HEADER = 'x-correlation-id';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

const correlationIdPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers[HEADER];
    const correlationId =
      typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

    request.correlationId = correlationId;
    reply.header(HEADER, correlationId);

    request.log = request.log.child({ correlationId });
  });
};

export default fp(correlationIdPlugin, { name: 'correlationId' });