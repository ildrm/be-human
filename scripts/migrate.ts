import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://be_human:be_human_dev@localhost:5432/be_human';
const pool = new pg.Pool({ connectionString });
const directory = resolve(process.cwd(), 'database/migrations');

try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migration (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const files = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  for (const file of files) {
    const applied = await pool.query('SELECT 1 FROM schema_migration WHERE version=$1', [file]);
    if (applied.rowCount) continue;
    const sql = await readFile(resolve(directory, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migration(version) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      await client.query('COMMIT');
      process.stdout.write(`Applied ${file}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
} finally { await pool.end(); }
