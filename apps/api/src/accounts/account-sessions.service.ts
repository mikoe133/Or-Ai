import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { AccountSchema, AccountSessionRequestSchema } from '@orai/contracts/private';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma } from '../generated/prisma/client';
import { credentialDigest, newCredential } from '../redemption/credentials';
import { AccountIdentityService, type AccountAccess } from './account-identity.service';
import { AccountCookiesService } from './account-cookies.service';
import { AccountTokenCipher } from './account-token-cipher';
import { SupabaseAuthGateway } from './supabase-auth.gateway';

const invalid = () => new ApiException('AUTH_REQUIRED', '账户授权已失效，请重新登录', 401);

@Injectable()
export class AccountSessionsService {
  private readonly cipher: AccountTokenCipher | null;
  constructor(private readonly database: DatabaseService, private readonly identity: AccountIdentityService,
    private readonly gateway: SupabaseAuthGateway, private readonly cookies: AccountCookiesService,
    @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {
    this.cipher = configuration.auth ? new AccountTokenCipher(configuration.auth.sessionEncryptionKey) : null;
  }
  get configured() { return Boolean(this.configuration.auth); }
  private get scope() { return this.configuration.environment === 'production' ? 'LIVE' as const : 'DEMO' as const; }
  private context(id: string, kind: 'access' | 'refresh') { return this.scope + ':' + id + ':' + kind; }
  private requireCipher() {
    if (!this.cipher) throw new ApiException('SERVICE_UNAVAILABLE', '账户服务尚未配置，请使用兑换码或稍后重试', 503);
    return this.cipher;
  }
  private get transactionOptions() {
    return { maxWait: 8000, timeout: (this.configuration.auth?.requestTimeoutMs ?? 8000) * 4 + 5000 };
  }
  private revoke(tx: Prisma.TransactionClient, id: string) {
    return tx.accountSession.update({ where: { id }, data: { revokedAt: new Date(), accessCredential: null, refreshCredential: null } });
  }
  async handoff(input: unknown) {
    const cipher = this.requireCipher(), body = parseInput(AccountSessionRequestSchema, input);
    const initial = await this.identity.authorize(body.accessToken), proof = this.identity.identity(initial);
    const result = await this.database.client.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${'account-handoff:' + this.scope + ':' + proof.supabaseSessionId}, 0))`);
      const existing = await tx.accountSession.findUnique({ where: { supabaseSessionId_scope: { supabaseSessionId: proof.supabaseSessionId, scope: this.scope } } });
      if (existing) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.account_sessions WHERE id=${existing.id}::uuid FOR UPDATE`);
      // A password login creates a new provider session. Old credentials may
      // never reopen a locally logged-out or expired provider session.
      const current = existing ? await tx.accountSession.findUniqueOrThrow({ where: { id: existing.id } }) : null;
      if (current && (current.revokedAt || current.expiresAt <= new Date())) throw invalid();
      // Refresh proves that both submitted credentials describe the same live
      // provider session, and prevents old JWTs from resurrecting logged-out sessions.
      const refreshed = await this.gateway.refresh(body.refreshToken);
      if (refreshed.identity.supabaseUserId !== proof.supabaseUserId || refreshed.identity.supabaseSessionId !== proof.supabaseSessionId) throw invalid();
      const access = await this.identity.authorize(refreshed.accessToken, tx);
      const fresh = this.identity.identity(access);
      if (fresh.supabaseUserId !== proof.supabaseUserId || fresh.supabaseSessionId !== proof.supabaseSessionId ||
        existing && existing.userId !== access.userId) throw invalid();
      const id = existing?.id ?? randomUUID(), token = newCredential(), now = new Date();
      const expiresAt = current?.expiresAt ?? new Date(now.getTime() + this.configuration.auth!.sessionDays * 86_400_000);
      const data = { userId: access.userId, scope: access.scope, supabaseSessionId: proof.supabaseSessionId, tokenDigest: credentialDigest(token),
        accessCredential: cipher.seal(refreshed.accessToken, this.context(id, 'access')),
        refreshCredential: cipher.seal(refreshed.refreshToken, this.context(id, 'refresh')), accessExpiresAt: refreshed.identity.expiresAt,
        expiresAt, revokedAt: null };
      const row = existing ? await tx.accountSession.update({ where: { id }, data }) : await tx.accountSession.create({ data: { id, ...data } });
      this.identity.attachSession(access, row.id, row.tokenDigest);
      return { token, expiresAt: row.expiresAt, account: await this.account(access, tx) };
    }, this.transactionOptions);
    return result;
  }
  async fromToken(token: unknown): Promise<AccountAccess | undefined> {
    if (!this.configured || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
    const cipher = this.requireCipher(), digest = credentialDigest(token);
    const reference = await this.database.client.accountSession.findFirst({ where: { tokenDigest: digest, scope: this.scope }, select: { id: true } });
    if (!reference) return undefined;
    const result = await this.database.client.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.account_sessions WHERE id=${reference.id}::uuid FOR UPDATE`);
      let row = await tx.accountSession.findFirst({ where: { id: reference.id, tokenDigest: digest, scope: this.scope } });
      if (!row || row.revokedAt) return undefined;
      if (row.expiresAt <= new Date()) { await this.revoke(tx, row.id); return undefined; }
      try {
        if (!row.accessCredential || !row.refreshCredential) throw invalid();
        let accessToken = cipher.open(row.accessCredential, this.context(row.id, 'access'));
        if (row.accessExpiresAt.getTime() <= Date.now() + 60_000) {
          const refreshed = await this.gateway.refresh(cipher.open(row.refreshCredential, this.context(row.id, 'refresh')));
          const user = await tx.user.findUniqueOrThrow({ where: { id: row.userId } });
          if (refreshed.identity.supabaseUserId !== user.supabaseUserId || refreshed.identity.supabaseSessionId !== row.supabaseSessionId) throw invalid();
          accessToken = refreshed.accessToken;
          row = await tx.accountSession.update({ where: { id: row.id }, data: {
            accessCredential: cipher.seal(accessToken, this.context(row.id, 'access')),
            refreshCredential: cipher.seal(refreshed.refreshToken, this.context(row.id, 'refresh')), accessExpiresAt: refreshed.identity.expiresAt } });
        }
        const access = await this.identity.authorize(accessToken, tx), proof = this.identity.identity(access);
        if (access.userId !== row.userId || proof.supabaseSessionId !== row.supabaseSessionId) throw invalid();
        this.identity.attachSession(access, row.id, digest);
        await this.identity.fresh(access, tx);
        return access;
      } catch (error) {
        if (error instanceof ApiException && error.code === 'AUTH_REQUIRED') { await this.revoke(tx, row.id); return undefined; }
        throw error; // Outages preserve the session so the user can retry.
      }
    }, this.transactionOptions);
    return result;
  }
  fromRequest(request: Request) { return this.fromToken(this.cookies.read(request)); }
  async requireRequest(request: Request) {
    const access = await this.fromRequest(request);
    if (!access) throw invalid();
    return access;
  }
  async account(access: AccountAccess, tx?: Prisma.TransactionClient) {
    const user = await this.identity.fresh(access, tx);
    return AccountSchema.parse({ id: user.id, emailVerified: access.emailVerified, role: user.role.toLowerCase() });
  }
  async expiresAt(access: AccountAccess) {
    await this.identity.fresh(access);
    const session = this.identity.identity(access).localSession;
    if (!session) throw invalid();
    return (await this.database.client.accountSession.findUniqueOrThrow({ where: { id: session.id } })).expiresAt;
  }
  async logout(token: unknown) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return { providerRevoked: null };
    const digest = credentialDigest(token);
    const reference = await this.database.client.accountSession.findFirst({ where: { tokenDigest: digest, scope: this.scope }, select: { id: true } });
    if (!reference) return { providerRevoked: null };
    const sealed = await this.database.client.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.account_sessions WHERE id=${reference.id}::uuid FOR UPDATE`);
      const row = await tx.accountSession.findFirst({ where: { id: reference.id, tokenDigest: digest, scope: this.scope, revokedAt: null } });
      if (!row) return undefined;
      await this.revoke(tx, row.id);return row;
    });
    if (!sealed) return { providerRevoked: null };
    // The local revocation is already committed. A provider outage cannot roll
    // it back, keep a usable cookie or leak credentials through an error.
    try {
      if (!sealed.accessCredential) throw invalid();
      let accessToken = this.requireCipher().open(sealed.accessCredential, this.context(sealed.id, 'access'));
      if (sealed.accessExpiresAt <= new Date()) {
        if (!sealed.refreshCredential) throw invalid();
        const fresh = await this.gateway.refresh(this.requireCipher().open(sealed.refreshCredential, this.context(sealed.id, 'refresh')));
        const user = await this.database.client.user.findUniqueOrThrow({ where: { id: sealed.userId } });
        if (fresh.identity.supabaseUserId !== user.supabaseUserId || fresh.identity.supabaseSessionId !== sealed.supabaseSessionId) throw invalid();
        accessToken = fresh.accessToken;
      }
      await this.gateway.logout(accessToken);return { providerRevoked: true };
    } catch { return { providerRevoked: false }; }
  }
}
