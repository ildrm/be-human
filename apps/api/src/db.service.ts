import { Injectable, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    application_name: 'be-human-api',
  });

  query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
