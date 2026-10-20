import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { AccountApi } from './account-api.js';
import { TransientAuthStorage, type DurableStorage } from './storage.js';
import { AuthFlowError, invalidCallback, providerFailure } from './errors.js';
export { AuthFlowError } from './errors.js';

interface AuthSettings { url?: string; publishableKey?: string; appOrigin?: string; production?: boolean }
export interface AuthConfiguration { url: string; publishableKey: string; appOrigin: string }
export function authConfiguration(settings: AuthSettings, currentOrigin: string): AuthConfiguration | null {
  if (!settings.url && !settings.publishableKey) return null;
  const fail = () => { throw new AuthFlowError('CONFIGURATION', '账户服务配置不完整，请联系站点管理员。'); };
  if (!settings.url || !settings.publishableKey || settings.production && !settings.appOrigin) return fail();
  let provider: URL, app: URL;
  try { provider = new URL(settings.url); app = new URL(settings.appOrigin || currentOrigin); } catch { return fail(); }
  for (const url of [provider, app]) {
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.protocol !== 'https:' &&
      !(settings.production !== true && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return fail();
  }
  if (app.origin !== currentOrigin) return fail();
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]{20,160}$/.test(settings.publishableKey);
  if (!publicKey && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(settings.publishableKey)) {
    try { publicKey = JSON.parse(atob(settings.publishableKey.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; } catch { /* Reject secret or invalid keys. */ }
  }
  if (!publicKey) return fail();
  return { url: provider.origin, publishableKey: settings.publishableKey, appOrigin: app.origin };
}

export interface AuthCallback { readonly kind: 'verification' | 'recovery'; readonly code: string; readonly flowId: string }
export function parseAuthCallback(href: string, origin: string): AuthCallback {
  let url: URL;
  try { url = new URL(href); } catch { throw invalidCallback(); }
  const code = url.searchParams.get('code'), flowId = url.searchParams.get('sb_flow_id');
  if (url.origin !== origin || url.hash || !['/auth/callback', '/auth/reset'].includes(url.pathname) ||
    [...url.searchParams.keys()].some(key => !['code', 'sb_flow_id'].includes(key)) ||
    url.searchParams.getAll('code').length !== 1 || url.searchParams.getAll('sb_flow_id').length !== 1 ||
    !code || !/^[A-Za-z0-9_-]{1,2048}$/.test(code) || !flowId || !/^[A-Za-z0-9_-]{8,64}$/.test(flowId)) throw invalidCallback();
  return Object.freeze({ kind: url.pathname === '/auth/reset' ? 'recovery' : 'verification', code, flowId });
}

interface ClientHandle { client: SupabaseClient; storage: TransientAuthStorage }
export class AuthFlow {
  private cooldownUntil = 0;
  private recovery: { handle: ClientHandle; session: Session; expiresAt: number } | null = null;
  private callbackPromise?: Promise<{ kind: 'verified' | 'recovery' }>;
  constructor(private readonly config: AuthConfiguration, private readonly api: AccountApi,
    private readonly durable: DurableStorage | null, private readonly now = Date.now) {}
  get mailCooldownSeconds() { return Math.max(0, Math.ceil((this.cooldownUntil - this.now()) / 1000)); }
  get hasRecovery() {
    if (this.recovery && this.recovery.expiresAt <= this.now()) this.discardRecovery();
    return Boolean(this.recovery);
  }
  discardRecovery() {
    if (!this.recovery) return;
    this.recovery.handle.storage.clearMemory(); void this.recovery.handle.client.auth.dispose(); this.recovery = null;
  }
  private credentials(email: string, password?: string) {
    const canonical = email.trim();
    if (canonical.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(canonical) ||
      password !== undefined && (password.length < 8 || password.length > 128)) throw new AuthFlowError('INVALID_INPUT', '请输入有效邮箱，密码需为 8–128 位。');
    return canonical;
  }
  private async client(): Promise<ClientHandle> {
    const storageKey = 'orai-transient-' + crypto.randomUUID();
    const storage = new TransientAuthStorage(this.durable, this.config.url, storageKey, this.now);
    const client = createClient(this.config.url, this.config.publishableKey, { auth: {
      storageKey, storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce',
      experimental: { appendPkceFlowIdToRedirects: true },
    }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) } });
    await client.auth.initialize();
    // Close the SDK's BroadcastChannel and background listeners before any
    // credentials exist. Public auth methods remain available after dispose.
    await client.auth.dispose();
    return { client, storage };
  }
  private async finish(handle: ClientHandle) { handle.storage.clearMemory(); await handle.client.auth.dispose(); }
  private async emailOperation(operation: (client: SupabaseClient) => Promise<{ error: { code?: string; status?: number } | null }>) {
    if (this.mailCooldownSeconds) throw new AuthFlowError('RATE_LIMITED', '请稍后再发送邮件。', this.mailCooldownSeconds);
    this.cooldownUntil = this.now() + 60000;
    const handle = await this.client();
    try { const result = await operation(handle.client); if (result.error) throw providerFailure(result.error); }
    finally { await this.finish(handle); }
  }
  async register(email: string, password: string) {
    email = this.credentials(email, password);
    await this.emailOperation(client => client.auth.signUp({ email, password, options: { emailRedirectTo: this.config.appOrigin + '/auth/callback' } }));
  }
  async resendVerification(email: string) {
    email = this.credentials(email);
    await this.emailOperation(client => client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: this.config.appOrigin + '/auth/callback' } }));
  }
  async forgotPassword(email: string) {
    email = this.credentials(email);
    await this.emailOperation(client => client.auth.resetPasswordForEmail(email, { redirectTo: this.config.appOrigin + '/auth/reset' }));
  }
  async login(email: string, password: string) {
    email = this.credentials(email, password); this.discardRecovery();
    const handle = await this.client();
    try {
      const { data, error } = await handle.client.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw providerFailure(error);
      return await this.api.handoff(data.session.access_token, data.session.refresh_token);
    } finally { await this.finish(handle); }
  }
  callback(callback: AuthCallback) {
    // One operation survives StrictMode remounts; single-use codes are never
    // exchanged twice or replayed after the backend refresh rotates tokens.
    return this.callbackPromise ??= this.exchange(callback);
  }
  private async exchange(callback: AuthCallback) {
    const handle = await this.client(); let retain = false;
    let recoveryFlow = false;
    const { data: subscription } = handle.client.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') recoveryFlow = true; });
    try {
      const { data, error } = await handle.client.auth.exchangeCodeForSession(callback.code, { flowId: callback.flowId });
      if (error) { if (error.name === 'AuthRetryableFetchError' || error.status && error.status >= 500) throw providerFailure(error); throw invalidCallback(); }
      if (!data.session || recoveryFlow !== (callback.kind === 'recovery')) throw invalidCallback();
      if (callback.kind === 'recovery') {
        this.discardRecovery(); this.recovery = { handle, session: data.session, expiresAt: this.now() + 600000 }; retain = true;
        return { kind: 'recovery' as const };
      }
      await this.api.handoff(data.session.access_token, data.session.refresh_token);
      return { kind: 'verified' as const };
    } finally { subscription.subscription.unsubscribe(); if (!retain) await this.finish(handle); }
  }
  async resetPassword(password: string) {
    this.credentials('validation@example.test', password);
    if (!this.hasRecovery || !this.recovery) throw invalidCallback();
    const recovery = this.recovery;
    const { error } = await recovery.handle.client.auth.updateUser({ password });
    if (error) throw providerFailure(error);
    // The password is already changed. A failed business-session handoff must
    // send the user to password login, never pretend the reset can be repeated.
    try {
      const { data, error: sessionError } = await recovery.handle.client.auth.getSession();
      if (sessionError || !data.session) throw providerFailure(sessionError);
      return await this.api.handoff(data.session.access_token, data.session.refresh_token);
    }
    catch { throw new AuthFlowError('LOGIN_REQUIRED', '密码已更新，请使用新密码登录。'); }
    finally { this.discardRecovery(); }
  }
}
