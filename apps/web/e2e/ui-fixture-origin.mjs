export function uiFixtureOrigin(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid UI fixture port');
  return 'http://127.0.0.1:' + port;
}
