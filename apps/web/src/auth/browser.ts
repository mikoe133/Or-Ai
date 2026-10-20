import { AuthFlow, AuthFlowError, authConfiguration, parseAuthCallback, type AuthCallback } from './core.js';
import { AccountApi } from './account-api.js';
import type { DurableStorage } from './storage.js';

export const accountApi = new AccountApi();
let auth: AuthFlow | null = null, configurationError: AuthFlowError | null = null;
try {
  const config = authConfiguration({ url: import.meta.env.VITE_SUPABASE_URL, publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    appOrigin: import.meta.env.VITE_APP_PUBLIC_ORIGIN, production: import.meta.env.PROD }, window.location.origin);
  if (config) {
    let storage: DurableStorage | null = null;
    try { storage = window.localStorage; } catch { /* Password login remains available without durable storage. */ }
    auth = new AuthFlow(config, accountApi, storage);
  }
} catch { configurationError = new AuthFlowError('CONFIGURATION', '账户服务配置不完整，请联系站点管理员。'); }
export const browserAuth = { auth, configurationError };

// Capture once before Router/React mounts, then remove one-time credentials
// from the address bar, history state and subsequent referrers.
export const callbackCapture: { callback: AuthCallback | null; error: AuthFlowError | null } = { callback: null, error: null };
if (['/auth/callback', '/auth/reset'].includes(window.location.pathname)) {
  try { callbackCapture.callback = parseAuthCallback(window.location.href, window.location.origin); }
  catch (error) { callbackCapture.error = error instanceof AuthFlowError ? error : new AuthFlowError('CALLBACK_INVALID', '验证链接已失效，请重新申请。'); }
  window.history.replaceState(null, '', window.location.pathname);
}
window.addEventListener('pagehide', () => auth?.discardRecovery());
