import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IdSchema } from '@orai/contracts';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { ApiException } from '../common/http-errors';

export interface SupabaseIdentity {
  supabaseUserId: string;
  supabaseSessionId: string;
  expiresAt: Date;
  emailVerified: boolean;
}

const unauthorized = () => new ApiException('AUTH_REQUIRED', '账户授权已失效，请重新登录', 401);

@Injectable()
export class SupabaseAuthGateway implements OnModuleDestroy {
  private readonly client: SupabaseClient | null;
  constructor(@Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {
    this.client = configuration.auth ? this.newClient() : null;
  }
  private newClient() {
    const auth = this.configuration.auth;
    if (!auth) throw new ApiException('SERVICE_UNAVAILABLE', '账户服务尚未配置，请使用兑换码或稍后重试', 503);
    return createClient(auth.url, auth.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(auth.requestTimeoutMs)]) : AbortSignal.timeout(auth.requestTimeoutMs) }) },
    });
  }
  async refresh(refreshToken: unknown) {
    this.configured();
    if (typeof refreshToken !== 'string' || !/^[A-Za-z0-9._-]{8,2048}$/.test(refreshToken)) throw unauthorized();
    try {
      const auth = this.configuration.auth!;
      // The official SDK retries refresh transport failures for about 30s and
      // has mutable session state. Use its documented Auth REST protocol once
      // with a deadline; verify every returned token through the SDK below.
      const response = await fetch(auth.url + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: { apikey: auth.publishableKey, 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }), signal: AbortSignal.timeout(auth.requestTimeoutMs),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429 || response.status >= 500) throw new ApiException('SERVICE_UNAVAILABLE', '账户服务暂不可用，请稍后重试', 503);
        throw unauthorized();
      }
      const session = await response.json() as { access_token?: unknown; refresh_token?: unknown };
      if (typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string' || !/^[A-Za-z0-9._-]{8,2048}$/.test(session.refresh_token)) throw unauthorized();
      const identity = await this.verify(session.access_token);
      return { accessToken: session.access_token, refreshToken: session.refresh_token, identity };
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('SERVICE_UNAVAILABLE', '账户服务暂不可用，请稍后重试', 503);
    }
  }
  async logout(accessToken: string) {
    const client = this.configured();
    try {
      // This SDK method calls /logout with the user's JWT and local scope. It
      // does not use, need or load an administrative/service-role key.
      const result = await client.auth.admin.signOut(accessToken, 'local');
      if (result.error) this.failure(result.error);
    } catch (error) { this.failure(error); }
  }
  async onModuleDestroy() { await this.client?.auth.dispose(); }
  private configured() {
    if (!this.client) throw new ApiException('SERVICE_UNAVAILABLE', '账户服务尚未配置，请使用兑换码或稍后重试', 503);
    return this.client;
  }
  private failure(error: unknown): never {
    if (error instanceof ApiException) throw error;
    const detail = error as { status?: number; name?: string } | undefined;
    if (detail?.status && (detail.status >= 500 || detail.status === 429) || detail?.name === 'AuthRetryableFetchError') {
      throw new ApiException('SERVICE_UNAVAILABLE', '账户服务暂不可用，请稍后重试', 503);
    }
    throw unauthorized();
  }
  async verify(input: unknown): Promise<SupabaseIdentity> {
    const client = this.configured();
    if (typeof input !== 'string' || input.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(input)) throw unauthorized();
    try {
      const header = JSON.parse(Buffer.from(input.split('.')[0]!, 'base64url').toString());
      if (!['ES256', 'RS256', 'HS256'].includes(header.alg)) throw unauthorized();
      // The SDK verifies JWKS signatures, or delegates legacy symmetric keys
      // to Auth. Decoding below never replaces signature verification.
      const verified = await client.auth.getClaims(input);
      if (verified.error) this.failure(verified.error);
      if (!verified.data) throw unauthorized();
      const claims = verified.data.claims, now = Math.floor(Date.now() / 1000);
      if (claims.iss !== this.configuration.auth!.url + '/auth/v1' || claims.role !== 'authenticated' ||
        !(claims.aud === 'authenticated' || Array.isArray(claims.aud) && claims.aud.length === 1 && claims.aud[0] === 'authenticated') ||
        !Number.isSafeInteger(claims.exp) || claims.exp <= now || !Number.isFinite(new Date(claims.exp * 1000).getTime()) ||
        !Number.isSafeInteger(claims.iat) || claims.iat <= 0 || claims.iat > now + 60 ||
        claims.nbf !== undefined && (!Number.isInteger(claims.nbf) || Number(claims.nbf) > now) ||
        !IdSchema.safeParse(claims.sub).success || !IdSchema.safeParse(claims.session_id).success) throw unauthorized();
      // A signed token alone does not prove current remote account state or
      // email confirmation. Always consult Auth, and ignore editable metadata.
      const remote = await client.auth.getUser(input);
      if (remote.error) this.failure(remote.error);
      const user = remote.data.user as typeof remote.data.user & { banned_until?: string; deleted_at?: string };
      if (!user || user.id !== claims.sub || user.aud !== 'authenticated' || user.is_anonymous || user.deleted_at ||
        user.banned_until && new Date(user.banned_until).getTime() > Date.now()) throw unauthorized();
      const confirmed = user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : NaN;
      return { supabaseUserId: claims.sub.toLowerCase(), supabaseSessionId: String(claims.session_id).toLowerCase(),
        expiresAt: new Date(claims.exp * 1000), emailVerified: Boolean(user.email) && Number.isFinite(confirmed) && confirmed <= Date.now() };
    } catch (error) { this.failure(error); }
  }
}
