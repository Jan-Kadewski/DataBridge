import 'dotenv/config';
import { z } from 'zod';


const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  PGHOST: z.string().min(1),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGDATABASE: z.string().min(1),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),
  PG_POOL_MAX: z.coerce.number().int().positive().default(10),

  SF_LOGIN_URL: z.string().url().default('https://login.salesforce.com'),
  SF_CLIENT_ID: z.string().optional(),
  SF_USERNAME: z.string().optional(),
  SF_PRIVATE_KEY_PATH: z.string().optional(),

  MULESOFT_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  MULESOFT_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(' Invalid environment configuration:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = loadEnv();