import { pool } from '../db/pool.js';
import {
  insertContact,
  insertSyncLog,
  listContacts as dbListContacts,
  type CreateContactInput,
} from '../db/queries.js';
import { contactFromRow, type Contact } from './mappers.js';
import type { ServiceContext } from './accounts.js';

export interface ListContactsOptions {
  limit: number;
  offset: number;
  accountExternalId?: string;
}

export async function listContacts(
  opts: ListContactsOptions,
): Promise<{ data: Contact[]; total: number }> {
  const { rows, total } = await dbListContacts(opts);
  return { data: rows.map(contactFromRow), total };
}

export async function createContact(
  input: CreateContactInput,
  ctx: ServiceContext,
): Promise<Contact> {
  const started = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const created = await insertContact(input);

    await insertSyncLog(
      {
        correlationId: ctx.correlationId,
        operation: 'CREATE_CONTACT',
        direction: 'OUTBOUND',
        objectName: 'Contact',
        recordId: created.id,
        status: 'SUCCESS',
        durationMs: Date.now() - started,
      },
      client,
    );

    await client.query('COMMIT');
    ctx.logger.info({ contactId: created.id }, 'Contact created');
    return contactFromRow(created);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await insertSyncLog({
      correlationId: ctx.correlationId,
      operation: 'CREATE_CONTACT',
      direction: 'OUTBOUND',
      objectName: 'Contact',
      status: 'ERROR',
      durationMs: Date.now() - started,
      errorMessage: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}