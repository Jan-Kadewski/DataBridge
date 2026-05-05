import { env } from '../config/env.js';

export interface AccountWebhookPayload {
  accounts: Array<{
    externalId: string;
    name: string;
    industry?: string | null;
    annualRevenue?: number | null;
    billingCity?: string | null;
  }>;
}

export interface ContactWebhookPayload {
  contacts: Array<{
    externalId: string;
    accountExternalId?: string | null;
    firstName?: string | null;
    lastName: string;
    email?: string | null;
  }>;
}

export interface WebhookContext {
  correlationId: string;
  logger: {
    info: (obj: object, msg?: string) => void;
    warn: (obj: object, msg?: string) => void;
    error: (obj: object, msg?: string) => void;
  };
}

async function postWebhook(
  path: string,
  body: unknown,
  ctx: WebhookContext,
): Promise<void> {
  const url = `${env.MULESOFT_WEBHOOK_URL}${path}`;
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.MULESOFT_API_KEY,
        'X-Correlation-ID': ctx.correlationId,
      },
      body: JSON.stringify(body),
      // Generous timeout — MuleSoft sync to SF can take a few seconds.
      signal: AbortSignal.timeout(30_000),
    });

    const durationMs = Date.now() - started;

    if (!response.ok) {
      const responseText = await response.text().catch(() => '(no body)');
      ctx.logger.warn(
        {
          url,
          status: response.status,
          durationMs,
          responseText: responseText.slice(0, 500),
        },
        'MuleSoft webhook returned non-2xx',
      );
      return;
    }

    ctx.logger.info(
      { url, status: response.status, durationMs },
      'MuleSoft webhook succeeded',
    );
  } catch (err) {
    ctx.logger.warn(
      { url, err, durationMs: Date.now() - started },
      'MuleSoft webhook failed — record stays in pending, ETL flow will catch up',
    );
    // Intentionally do NOT rethrow — fire-and-forget. PG row is already committed.
  }
}

export async function notifyAccountChange(
  payload: AccountWebhookPayload,
  ctx: WebhookContext,
): Promise<void> {
  await postWebhook('/sync/accounts', payload, ctx);
}

export async function notifyContactChange(
  payload: ContactWebhookPayload,
  ctx: WebhookContext,
): Promise<void> {
  await postWebhook('/sync/contacts', payload, ctx);
}