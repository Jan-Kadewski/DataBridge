import type {
  LegacyAccountRow,
  LegacyContactRow,
  SyncLogRow,
} from '../db/queries.js';

export interface Account {
  id: string;
  externalId: string | null;
  name: string;
  industry: string | null;
  annualRevenue: number | null;
  billingCity: string | null;
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  externalId: string | null;
  accountExternalId: string | null;
  firstName: string | null;
  lastName: string;
  email: string | null;
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLogEntry {
  id: string;
  correlationId: string;
  operation: string;
  direction: 'INBOUND' | 'OUTBOUND';
  objectName: string | null;
  recordId: string | null;
  status: 'SUCCESS' | 'ERROR' | 'IN_PROGRESS';
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export function accountFromRow(row: LegacyAccountRow): Account {
  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    industry: row.industry,
    annualRevenue: row.annual_revenue === null ? null : Number(row.annual_revenue),
    billingCity: row.billing_city,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function contactFromRow(row: LegacyContactRow): Contact {
  return {
    id: row.id,
    externalId: row.external_id,
    accountExternalId: row.account_external_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function syncLogFromRow(row: SyncLogRow): SyncLogEntry {
  return {
    id: row.id,
    correlationId: row.correlation_id,
    operation: row.operation,
    direction: row.direction,
    objectName: row.object_name,
    recordId: row.record_id,
    status: row.status,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
  };
}