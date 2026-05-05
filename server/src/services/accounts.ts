import { pool } from '../db/pool.js';
import { notifyAccountChange } from './mulesoft.js';
import {
  insertAccount,
  listAccounts as dbListAccounts,
  getAccountById as dbGetAccountById,
  updateAccount as dbUpdateAccount,
  insertSyncLog,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '../db/queries.js';
import { accountFromRow, type Account } from './mappers.js';

export interface ServiceContext {
  correlationId: string;
  logger: {
    info: (obj: object, msg?: string) => void;
    error: (obj: object, msg?: string) => void;
    warn: (obj: object, msg?: string) => void;
  };
}

export interface ListAccountsOptions {
  limit: number;
  offset: number;
  syncStatus?: 'pending' | 'synced' | 'error';
}

export async function listAccounts(
  opts: ListAccountsOptions,
): Promise<{ data: Account[]; total: number }> {
  const { rows, total } = await dbListAccounts(opts);
  return { data: rows.map(accountFromRow), total };
}

export async function getAccount(id: string): Promise<Account | null> {
  const row = await dbGetAccountById(id);
  return row ? accountFromRow(row) : null;
}

export async function createAccount(
  input: CreateAccountInput,
  ctx: ServiceContext,
): Promise<Account> {
  const started = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const created = await insertAccount(input);

    await insertSyncLog(
      {
        correlationId: ctx.correlationId,
        operation: 'CREATE_ACCOUNT',
        direction: 'OUTBOUND',
        objectName: 'Account',
        status: 'SUCCESS',
        durationMs: Date.now() - started,
      },
      client,
    );

    await client.query('COMMIT');

    // Fire-and-forget webhook to MuleSoft. If this fails, PG row is already
    // committed and the scheduled ETL flow will pick it up later.
    void notifyAccountChange(
      {
        accounts: [
          {
            externalId: created.id,
            name: created.name,
            industry: created.industry,
            annualRevenue: created.annual_revenue === null
              ? null
              : Number(created.annual_revenue),
            billingCity: created.billing_city,
          },
        ],
      },
      ctx,
    );

    ctx.logger.info(
      { accountId: created.id, durationMs: Date.now() - started },
      'Account created',
    );

    return accountFromRow(created);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await insertSyncLog({
      correlationId: ctx.correlationId,
      operation: 'CREATE_ACCOUNT',
      direction: 'OUTBOUND',
      objectName: 'Account',
      status: 'ERROR',
      durationMs: Date.now() - started,
      errorMessage: err instanceof Error ? err.message : String(err),
    }).catch(() => {
    });
    throw err;
  } finally {
    client.release();
  }
}

export async function updateAccountById(
  id: string,
  input: UpdateAccountInput,
  ctx: ServiceContext,
): Promise<Account | null> {
  const started = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await dbUpdateAccount(id, input);
    if (!updated) {
      await client.query('ROLLBACK');
      return null;
    }

    await insertSyncLog(
      {
        correlationId: ctx.correlationId,
        operation: 'UPDATE_ACCOUNT',
        direction: 'OUTBOUND',
        objectName: 'Account',
        recordId: updated.id,
        status: 'SUCCESS',
        durationMs: Date.now() - started,
      },
      client,
    );

    await client.query('COMMIT');

void notifyAccountChange(
      {
        accounts: [
          {
            externalId: updated.id,
            name: updated.name,
            industry: updated.industry,
            annualRevenue: updated.annual_revenue === null
              ? null
              : Number(updated.annual_revenue),
            billingCity: updated.billing_city,
          },
        ],
      },
      ctx,
    );


    ctx.logger.info({ accountId: updated.id }, 'Account updated');


    return accountFromRow(updated);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await insertSyncLog({
      correlationId: ctx.correlationId,
      operation: 'UPDATE_ACCOUNT',
      direction: 'OUTBOUND',
      objectName: 'Account',
      recordId: id,
      status: 'ERROR',
      durationMs: Date.now() - started,
      errorMessage: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}