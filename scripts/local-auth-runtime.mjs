export function authComposeArguments(action) {
  const operations = {
    up: ['up', '--detach', '--build', '--wait', '--wait-timeout', '90'],
    stop: ['stop', '--timeout', '15'],
    // Compose restart does not wait on depends_on health. Recreate the same
    // services with their retained volumes through the ordered up workflow.
    restart: ['up', '--detach', '--force-recreate', '--no-build', '--wait', '--wait-timeout', '90'],
    config: ['config', '--quiet'],
  };
  if (!Object.hasOwn(operations, action)) throw new Error('Unsupported local Auth lifecycle action.');
  return ['compose', '--project-name', 'orai-auth-local', '--file', 'compose.auth.yml', ...operations[action]];
}

export async function localAuthReadiness(config, request = fetch) {
  for (const value of [config.authOrigin, config.mailOrigin, config.siteOrigin]) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Local readiness target refused.'); }
    if (url.origin !== value || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) throw new Error('Local readiness target refused.');
  }
  const [authReady, mailReady] = await Promise.all([
    config.authOrigin + '/auth/v1/health', config.mailOrigin + '/readyz',
  ].map(async url => { try { return (await request(url, { signal: AbortSignal.timeout(3000), redirect: 'error' })).ok; } catch { return false; } }));
  return { authReady, mailReady, ready: authReady && mailReady && config.enabled, appConfigured: config.enabled,
    authOrigin: config.authOrigin, siteOrigin: config.siteOrigin, mailOrigin: config.mailOrigin };
}
