import { Pool, type PoolClient, type PoolConfig } from 'pg';

export function createManagedPool(configuration: PoolConfig) {
  const pool = new Pool(configuration);
  const clients = new Set<PoolClient>();
  let socketsClosed: (() => void) | undefined;
  let closing: Promise<void> | undefined;
  pool.on('connect', client => clients.add(client));
  pool.on('remove', client => {
    clients.delete(client);
    if (clients.size === 0) socketsClosed?.();
  });
  return {
    pool,
    close(): Promise<void> {
      return closing ??= (async () => {
        // pg-pool can resolve end() before idle clients finish closing their
        // sockets. Its public remove event confirms the physical disconnect.
        await pool.end();
        if (clients.size > 0) await new Promise<void>(resolve => { socketsClosed = resolve; });
      })();
    },
  };
}
