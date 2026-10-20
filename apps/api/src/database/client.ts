import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { AppConfiguration } from '../config/configuration';
import { createManagedPool } from './pool';

export function createDatabaseClient(configuration: AppConfiguration) {
  const managed = createManagedPool({
    connectionString: configuration.databaseUrl, max: configuration.databasePoolMax,
    connectionTimeoutMillis: 2000, query_timeout: 5000, idleTimeoutMillis: 10000,
    ssl: configuration.databaseSsl ? { rejectUnauthorized: true } : false,
  });
  const { pool } = managed;
  const client = new PrismaClient({ adapter: new PrismaPg(pool, { schema: 'orai', disposeExternalPool: false }) });
  return {
    pool, client,
    async close() { try { await client.$disconnect(); } finally { await managed.close(); } },
  };
}
