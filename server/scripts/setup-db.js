import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to initialize the production database.');
}

const { Pool } = pg;
const databaseHost = new URL(process.env.DATABASE_URL).hostname;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost) ? false : { rejectUnauthorized: false },
});
const serverDirectory = dirname(dirname(fileURLToPath(import.meta.url)));

try {
  const schema = await readFile(join(serverDirectory, 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM properties');
  if (rows[0].count === 0) {
    const seed = await readFile(join(serverDirectory, 'db', 'seed.sql'), 'utf8');
    await pool.query(seed);
  }

  console.log('Database schema is ready.');
} finally {
  await pool.end();
}
