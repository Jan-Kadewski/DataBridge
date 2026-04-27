import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  database: env.PGDATABASE,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  max: env.PG_POOL_MAX,
  options: '-c search_path=databridge,public',
});

pool.on('error', (err) => {
  console.error('[pg pool] unexpected error on idle client', err);
  process.exit(1);
});