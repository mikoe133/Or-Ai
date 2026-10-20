import { seedDemo } from './seed-demo';

seedDemo(process.env).then(() => {
  // Full codes/tokens returned by the library remain ephemeral in memory.
  console.log('Demo fixtures seeded in the confirmed local database; credentials and codes were not printed.');
}).catch(() => {
  console.error('Demo seed failed or target was refused. Inspect target configuration and immutable version rules.');
  process.exitCode = 1;
});
