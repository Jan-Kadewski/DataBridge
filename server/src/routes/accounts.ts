import type { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  AccountResponse,
  CreateAccountBody,
  IdParam,
  ListAccountsQuery,
  ListAccountsResponse,
  UpdateAccountBody,
} from './schemas.js';
import {
  createAccount,
  getAccount,
  listAccounts,
  updateAccountById,
} from '../services/accounts.js';

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<TypeBoxTypeProvider>();

  router.get(
    '/api/accounts',
    {
      schema: {
        querystring: ListAccountsQuery,
        response: { 200: ListAccountsResponse },
      },
    },
    async (request) => {
      const { limit = 50, offset = 0, syncStatus } = request.query;
      const result = await listAccounts({ limit, offset, syncStatus });
      return { ...result, limit, offset };
    },
  );

  router.get(
    '/api/accounts/:id',
    {
      schema: {
        params: IdParam,
        response: { 200: AccountResponse },
      },
    },
    async (request, reply) => {
      const account = await getAccount(request.params.id);
      if (!account) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: `Account ${request.params.id} not found`,
        });
      }
      return account;
    },
  );

  router.post(
    '/api/accounts',
    {
      schema: {
        body: CreateAccountBody,
        response: { 201: AccountResponse },
      },
    },
    async (request, reply) => {
      const account = await createAccount(request.body, {
        correlationId: request.correlationId,
        logger: request.log,
      });
      return reply.status(201).send(account);
    },
  );

  router.patch(
    '/api/accounts/:id',
    {
      schema: {
        params: IdParam,
        body: UpdateAccountBody,
        response: { 200: AccountResponse },
      },
    },
    async (request, reply) => {
      const account = await updateAccountById(
        request.params.id,
        request.body,
        { correlationId: request.correlationId, logger: request.log },
      );
      if (!account) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: `Account ${request.params.id} not found`,
        });
      }
      return account;
    },
  );
}