import { defineConfig } from 'prisma/config';

// Generation needs no credentials. Migration commands receive only the separate
// migration account; there is deliberately no fallback to the runtime account.
const configured = process.env.MIGRATION_DATABASE_URL;
let url: URL;
try { url = new URL(configured ?? 'postgresql://unconfigured@127.0.0.1/unconfigured'); }
catch { throw new Error('Invalid configuration: MIGRATION_DATABASE_URL'); }
if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid configuration: MIGRATION_DATABASE_URL');
url.searchParams.set('schema', 'orai');
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: url.toString() },
});
