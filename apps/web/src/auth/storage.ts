import type { SupportedStorage } from '@supabase/supabase-js';
import { AuthFlowError } from './errors.js';

export type DurableStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// The SDK needs persistent PKCE verifiers for email redirects. Session and
// user keys deliberately use a separate, short-lived memory map.
export class TransientAuthStorage implements SupportedStorage {
  private readonly memory = new Map<string, string>();
  constructor(private readonly durable: DurableStorage | null, private readonly namespace: string,
    private readonly instanceKey: string, private readonly now = Date.now) {}
  private durableKey(key: string) {
    const suffix = key.startsWith(this.instanceKey) ? key.slice(this.instanceKey.length) : '';
    return /^(?:-code-verifier|-flows-code-verifier|-flow-[A-Za-z0-9_-]{1,64}-code-verifier)$/.test(suffix)
      ? 'orai-pkce-v1:' + this.namespace + ':' + suffix : null;
  }
  getItem(key: string): string | null {
    const durableKey = this.durableKey(key);
    if (!durableKey) return this.memory.get(key) ?? null;
    try {
      const raw = this.durable?.getItem(durableKey);
      if (!raw) return null;
      const record = JSON.parse(raw) as { value?: unknown; expiresAt?: unknown };
      if (typeof record.value === 'string' && record.value.length <= 16384 && typeof record.expiresAt === 'number' &&
        record.expiresAt > this.now() && record.expiresAt <= this.now() + 3600000) return record.value;
    } catch { /* A blocked or corrupt verifier cannot authorize a callback. */ }
    this.removeItem(key); return null;
  }
  setItem(key: string, value: string) {
    const durableKey = this.durableKey(key);
    if (!durableKey) { this.memory.set(key, value); return; }
    if (key.endsWith('-flows-code-verifier') && value === '[]') { this.removeItem(key); return; }
    try {
      if (!this.durable || value.length > 16384) throw new Error('storage');
      this.durable.setItem(durableKey, JSON.stringify({ value, expiresAt: this.now() + 3600000 }));
    } catch { throw new AuthFlowError('STORAGE_UNAVAILABLE', '请允许本站保存邮件验证信息，再重试。'); }
  }
  removeItem(key: string) {
    const durableKey = this.durableKey(key);
    if (!durableKey) { this.memory.delete(key); return; }
    try { this.durable?.removeItem(durableKey); } catch { /* Expired data remains unusable. */ }
  }
  clearMemory() { this.memory.clear(); }
}
