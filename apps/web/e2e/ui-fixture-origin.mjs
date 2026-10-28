import { randomUUID } from 'node:crypto';

export function uiFixtureOrigin(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid UI fixture port');
  return 'http://orai-cua-' + randomUUID() + '.localhost:' + port;
}
