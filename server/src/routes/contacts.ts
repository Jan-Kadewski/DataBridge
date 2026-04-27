import type { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  ContactResponse,
  CreateContactBody,
  ListContactsQuery,
  ListContactsResponse,
} from './schemas.js';
import { createContact, listContacts } from '../services/contacts.js';

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<TypeBoxTypeProvider>();

  router.get(
    '/api/contacts',
    {
      schema: {
        querystring: ListContactsQuery,
        response: { 200: ListContactsResponse },
      },
    },
    async (request) => {
      const { limit = 50, offset = 0, accountExternalId } = request.query;
      const result = await listContacts({ limit, offset, accountExternalId });
      return { ...result, limit, offset };
    },
  );

  router.post(
    '/api/contacts',
    {
      schema: {
        body: CreateContactBody,
        response: { 201: ContactResponse },
      },
    },
    async (request, reply) => {
      const contact = await createContact(request.body, {
        correlationId: request.correlationId,
        logger: request.log,
      });
      return reply.status(201).send(contact);
    },
  );
}