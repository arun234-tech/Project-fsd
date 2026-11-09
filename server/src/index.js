import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const { Pool } = pg;
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const databaseName = 'real_estate_portal';
const embeddedDatabaseEnabled = process.env.USE_EMBEDDED_POSTGRES === 'true' && !process.env.DATABASE_URL;
const embeddedDatabaseDirectory = join(serverDirectory, '..', '.data', 'postgres');
const embeddedDatabase = embeddedDatabaseEnabled
  ? new EmbeddedPostgres({
      databaseDir: embeddedDatabaseDirectory,
      user: 'postgres',
      password: process.env.EMBEDDED_POSTGRES_PASSWORD || 'real-estate-local-only',
      port: Number(process.env.EMBEDDED_POSTGRES_PORT || 5432),
      persistent: true,
      onError: error => console.error('[embedded-postgres]', error),
    })
  : null;
const connectionString = process.env.DATABASE_URL
  || `postgresql://postgres:${encodeURIComponent(process.env.EMBEDDED_POSTGRES_PASSWORD || 'real-estate-local-only')}@127.0.0.1:${process.env.EMBEDDED_POSTGRES_PORT || 5432}/${databaseName}`;
const databaseHost = new URL(connectionString).hostname;
export const pool = new Pool({
  connectionString,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost) ? false : { rejectUnauthorized: false },
});
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: clientOrigins }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'real-estate-portal-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.get('/api/my/properties', requireAuth, async (req, res, next) => {
  try { const result = await pool.query('SELECT * FROM properties WHERE owner_id=$1 ORDER BY created_at DESC', [req.user.id]); res.json(result.rows); }
  catch (err) { next(err); }
});
app.use((err, _req, res, _next) => {
  console.error(err);
  if (['ECONNREFUSED', 'ETIMEDOUT', '3D000', '28P01'].includes(err.code)) {
    return res.status(503).json({ message: 'Database unavailable or misconfigured. Start PostgreSQL and verify DATABASE_URL.' });
  }
  res.status(500).json({ message: 'Something went wrong on the server.' });
});
const port = process.env.PORT || 5001;

async function start() {
  if (embeddedDatabase) {
    if (!existsSync(join(embeddedDatabaseDirectory, 'PG_VERSION'))) {
      await embeddedDatabase.initialise();
    }
    await embeddedDatabase.start();

    const adminClient = embeddedDatabase.getPgClient();
    await adminClient.connect();
    let databaseExists;
    try {
      const result = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
      databaseExists = result.rowCount > 0;
    } finally {
      await adminClient.end();
    }
    if (!databaseExists) {
      await embeddedDatabase.createDatabase(databaseName);
    }
  }

  await pool.query('SELECT 1');
  if (embeddedDatabase) {
    const schema = await readFile(join(serverDirectory, '..', 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM properties');
    if (rows[0].count === 0) {
      const seed = await readFile(join(serverDirectory, '..', 'db', 'seed.sql'), 'utf8');
      await pool.query(seed);
    }
  }

  app.listen(port, () => console.log(`API running at http://localhost:${port}`));
}

start().catch(error => {
  console.error('Could not start the API:', error);
  pool.end()
    .catch(poolError => console.error('Could not close the database pool:', poolError))
    .finally(async () => {
      if (embeddedDatabase) {
        try {
          await embeddedDatabase.stop();
        } catch (stopError) {
          console.error('Could not stop embedded PostgreSQL:', stopError);
        }
      }
      process.exitCode = 1;
    });
});
