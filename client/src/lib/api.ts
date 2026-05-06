// Base URL for the Node/Fastify backend.
const BASE = import.meta.env.VITE_API_BASE ?? '';

// Types mirroring server-side mappers — duplicated by design.
// For a larger project, generating shared types via openapi-typescript
// or TypeBox export would keep them in sync automatically.

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

export interface SyncMetrics {
  totalToday: number;
  successToday: number;
  errorsToday: number;
  successRatePct: number;
  avgDurationMs: number | null;
}

export interface Paged<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.message) message = errBody.message;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ---------- Accounts ----------
export interface CreateAccountInput {
  name: string;
  industry?: string | null;
  annualRevenue?: number | null;
  billingCity?: string | null;
}

export const api = {
  listAccounts: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<Paged<Account>>(`/api/accounts${suffix}`);
  },

  createAccount: (input: CreateAccountInput) =>
    request<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listSyncLog: (params?: {
    limit?: number;
    offset?: number;
    correlationId?: string;
    status?: SyncLogEntry['status'];
  }) => {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.correlationId) qs.set('correlationId', params.correlationId);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<Paged<SyncLogEntry>>(`/api/sync/logs${suffix}`);
  },

  getSyncMetrics: () => request<SyncMetrics>('/api/sync/metrics'),
};