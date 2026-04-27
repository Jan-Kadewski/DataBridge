import type { PoolClient } from 'pg';
import { pool } from './pool.js';


export interface LegacyAccountRow {
  id: string;
  external_id: string | null;
  name: string;
  industry: string | null;
  annual_revenue: string | null;
  billing_city: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyContactRow {
  id: string;
  external_id: string | null;
  account_external_id: string | null;
  first_name: string | null;
  last_name: string;
  email: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SyncLogRow {
  id: string;
  correlation_id: string;
  operation: string;
  direction: 'INBOUND' | 'OUTBOUND';
  object_name: string | null;
  record_id: string | null;
  status: 'SUCCESS' | 'ERROR' | 'IN_PROGRESS';
  duration_ms: number | null;
  error_message: string | null;
  created_at: Date;
}

export interface ListAccountsParams {
  limit: number;
  offset: number;
  syncStatus?: LegacyAccountRow['sync_status'];
}

export async function listAccounts(
  params: ListAccountsParams,
): Promise<{ rows: LegacyAccountRow[]; total: number }> {
  const client = await pool.connect();
  try {
    const filters: string[] = [];
    const values: unknown[] = [];

    if (params.syncStatus) {
      values.push(params.syncStatus);
      filters.push(`sync_status = $${values.length}`);
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    values.push(params.limit);
    const limitIdx = values.length;
    values.push(params.offset);
    const offsetIdx = values.length;

    const listSql = `
      SELECT id, external_id, name, industry, annual_revenue, billing_city,
             sync_status, last_synced_at, created_at, updated_at
      FROM legacy_accounts
      ${where}
      ORDER BY created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;
    const countSql = `SELECT COUNT(*)::int AS total FROM legacy_accounts ${where}`;

    const [rowsRes, countRes] = await Promise.all([
      client.query<LegacyAccountRow>(listSql, values),
      client.query<{ total: number }>(countSql, values.slice(0, filters.length)),
    ]);

    return { rows: rowsRes.rows, total: countRes.rows[0]?.total ?? 0 };
  } finally {
    client.release();
  }
}

export async function getAccountById(id: string): Promise<LegacyAccountRow | null> {
  const result = await pool.query<LegacyAccountRow>(
    `SELECT id, external_id, name, industry, annual_revenue, billing_city,
            sync_status, last_synced_at, created_at, updated_at
     FROM legacy_accounts
     WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface CreateAccountInput {
  name: string;
  industry?: string | null;
  annualRevenue?: number | null;
  billingCity?: string | null;
}

export async function insertAccount(input: CreateAccountInput): Promise<LegacyAccountRow> {
  const result = await pool.query<LegacyAccountRow>(
    `INSERT INTO legacy_accounts (name, industry, annual_revenue, billing_city)
     VALUES ($1, $2, $3, $4)
     RETURNING id, external_id, name, industry, annual_revenue, billing_city,
               sync_status, last_synced_at, created_at, updated_at`,
    [
      input.name,
      input.industry ?? null,
      input.annualRevenue ?? null,
      input.billingCity ?? null,
    ],
  );
  return result.rows[0]!;
}

export interface UpdateAccountInput {
  name?: string;
  industry?: string | null;
  annualRevenue?: number | null;
  billingCity?: string | null;
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<LegacyAccountRow | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    values.push(input.name);
    sets.push(`name = $${values.length}`);
  }
  if (input.industry !== undefined) {
    values.push(input.industry);
    sets.push(`industry = $${values.length}`);
  }
  if (input.annualRevenue !== undefined) {
    values.push(input.annualRevenue);
    sets.push(`annual_revenue = $${values.length}`);
  }
  if (input.billingCity !== undefined) {
    values.push(input.billingCity);
    sets.push(`billing_city = $${values.length}`);
  }

  if (sets.length === 0) {
    return getAccountById(id);
  }

  values.push(id);
  const result = await pool.query<LegacyAccountRow>(
    `UPDATE legacy_accounts
     SET ${sets.join(', ')}
     WHERE id = $${values.length}
     RETURNING id, external_id, name, industry, annual_revenue, billing_city,
               sync_status, last_synced_at, created_at, updated_at`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function upsertAccountByExternalId(
  externalId: string,
  input: UpdateAccountInput & { name: string },
): Promise<LegacyAccountRow> {
  const result = await pool.query<LegacyAccountRow>(
    `INSERT INTO legacy_accounts (external_id, name, industry, annual_revenue,
                                   billing_city, sync_status, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, 'synced', NOW())
     ON CONFLICT (external_id) DO UPDATE SET
       name            = EXCLUDED.name,
       industry        = EXCLUDED.industry,
       annual_revenue  = EXCLUDED.annual_revenue,
       billing_city    = EXCLUDED.billing_city,
       sync_status     = 'synced',
       last_synced_at  = NOW()
     RETURNING id, external_id, name, industry, annual_revenue, billing_city,
               sync_status, last_synced_at, created_at, updated_at`,
    [
      externalId,
      input.name,
      input.industry ?? null,
      input.annualRevenue ?? null,
      input.billingCity ?? null,
    ],
  );
  return result.rows[0]!;
}


export interface InsertSyncLogInput {
  correlationId: string;
  operation: string;
  direction: 'INBOUND' | 'OUTBOUND';
  objectName?: string | null;
  recordId?: string | null;
  status: 'SUCCESS' | 'ERROR' | 'IN_PROGRESS';
  durationMs?: number | null;
  errorMessage?: string | null;
}

export async function insertSyncLog(
  input: InsertSyncLogInput,
  client?: PoolClient,
): Promise<SyncLogRow> {
  const runner = client ?? pool;
  const result = await runner.query<SyncLogRow>(
    `INSERT INTO sync_log (correlation_id, operation, direction, object_name,
                           record_id, status, duration_ms, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, correlation_id, operation, direction, object_name,
               record_id, status, duration_ms, error_message, created_at`,
    [
      input.correlationId,
      input.operation,
      input.direction,
      input.objectName ?? null,
      input.recordId ?? null,
      input.status,
      input.durationMs ?? null,
      input.errorMessage ?? null,
    ],
  );
  return result.rows[0]!;
}

export interface ListSyncLogParams {
  limit: number;
  offset: number;
  correlationId?: string;
  status?: SyncLogRow['status'];
}

export async function listSyncLog(
  params: ListSyncLogParams,
): Promise<{ rows: SyncLogRow[]; total: number }> {
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.correlationId) {
    values.push(params.correlationId);
    filters.push(`correlation_id = $${values.length}`);
  }
  if (params.status) {
    values.push(params.status);
    filters.push(`status = $${values.length}`);
  }
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countValues = [...values];
  values.push(params.limit);
  const limitIdx = values.length;
  values.push(params.offset);
  const offsetIdx = values.length;

  const listSql = `
    SELECT id, correlation_id, operation, direction, object_name, record_id,
           status, duration_ms, error_message, created_at
    FROM sync_log
    ${where}
    ORDER BY created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM sync_log ${where}`;

  const [rowsRes, countRes] = await Promise.all([
    pool.query<SyncLogRow>(listSql, values),
    pool.query<{ total: number }>(countSql, countValues),
  ]);

  return { rows: rowsRes.rows, total: countRes.rows[0]?.total ?? 0 };
}

export interface SyncMetrics {
  totalToday: number;
  successToday: number;
  errorsToday: number;
  successRatePct: number;
  avgDurationMs: number | null;
}

export async function getSyncMetrics(): Promise<SyncMetrics> {
  const result = await pool.query<{
    total_today: number;
    success_today: number;
    errors_today: number;
    avg_duration_ms: string | null;
  }>(
    `SELECT
        COUNT(*)::int                                       AS total_today,
        COUNT(*) FILTER (WHERE status = 'SUCCESS')::int     AS success_today,
        COUNT(*) FILTER (WHERE status = 'ERROR')::int       AS errors_today,
        AVG(duration_ms) FILTER (WHERE status = 'SUCCESS')  AS avg_duration_ms
     FROM sync_log
     WHERE created_at >= date_trunc('day', NOW())`,
  );

  const row = result.rows[0]!;
  const total = row.total_today;
  const successRatePct = total === 0 ? 100 : Math.round((row.success_today / total) * 100);
  const avg = row.avg_duration_ms === null ? null : Math.round(Number(row.avg_duration_ms));

  return {
    totalToday: total,
    successToday: row.success_today,
    errorsToday: row.errors_today,
    successRatePct,
    avgDurationMs: avg,
  };
}


export interface ListContactsParams {
  limit: number;
  offset: number;
  accountExternalId?: string;
}

export async function listContacts(
  params: ListContactsParams,
): Promise<{ rows: LegacyContactRow[]; total: number }> {
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.accountExternalId) {
    values.push(params.accountExternalId);
    filters.push(`account_external_id = $${values.length}`);
  }
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countValues = [...values];
  values.push(params.limit);
  const limitIdx = values.length;
  values.push(params.offset);
  const offsetIdx = values.length;

  const listSql = `
    SELECT id, external_id, account_external_id, first_name, last_name, email,
           sync_status, last_synced_at, created_at, updated_at
    FROM legacy_contacts
    ${where}
    ORDER BY created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM legacy_contacts ${where}`;

  const [rowsRes, countRes] = await Promise.all([
    pool.query<LegacyContactRow>(listSql, values),
    pool.query<{ total: number }>(countSql, countValues),
  ]);

  return { rows: rowsRes.rows, total: countRes.rows[0]?.total ?? 0 };
}

export interface CreateContactInput {
  firstName?: string | null;
  lastName: string;
  email?: string | null;
  accountExternalId?: string | null;
}

export async function insertContact(input: CreateContactInput): Promise<LegacyContactRow> {
  const result = await pool.query<LegacyContactRow>(
    `INSERT INTO legacy_contacts (first_name, last_name, email, account_external_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, external_id, account_external_id, first_name, last_name, email,
               sync_status, last_synced_at, created_at, updated_at`,
    [
      input.firstName ?? null,
      input.lastName,
      input.email ?? null,
      input.accountExternalId ?? null,
    ],
  );
  return result.rows[0]!;
}