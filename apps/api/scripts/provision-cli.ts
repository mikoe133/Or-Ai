import { provisionLocalDatabase } from './local-database';

provisionLocalDatabase(process.env).then(() => {
  console.log('Local runtime role and database marker provisioned. Credentials were not printed.');
}).catch(() => {
  console.error('Local database provisioning failed; check target configuration, migration status and role permissions.');
  process.exitCode = 1;
});
