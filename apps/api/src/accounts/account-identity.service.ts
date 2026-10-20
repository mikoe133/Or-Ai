import { Inject, Injectable } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { Prisma, type DataScope } from '../generated/prisma/client';
import { SupabaseAuthGateway } from './supabase-auth.gateway';

declare const accountBrand: unique symbol;
export interface AccountAccess {
  readonly userId: string;
  readonly scope: DataScope;
  readonly emailVerified: boolean;
  readonly [accountBrand]: true;
}
const proofs = new WeakMap<object, { issuer: AccountIdentityService; supabaseUserId: string; supabaseSessionId: string; expiresAt: number;
  localSession?: { id: string; digest: string } }>();
const invalid = () => new ApiException('AUTH_REQUIRED', '账户授权已失效，请重新登录', 401);

@Injectable()
export class AccountIdentityService {
  constructor(private readonly database: DatabaseService, private readonly gateway: SupabaseAuthGateway,
    @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}
  private get scope(): DataScope { return this.configuration.environment === 'production' ? 'LIVE' : 'DEMO'; }

  async authorize(accessToken: string, transaction?: Prisma.TransactionClient): Promise<AccountAccess> {
    const identity = await this.gateway.verify(accessToken);
    if (!IdSchema.safeParse(identity.supabaseUserId).success || !IdSchema.safeParse(identity.supabaseSessionId).success ||
      !Number.isFinite(identity.expiresAt.getTime()) || identity.expiresAt <= new Date()) throw invalid();
    const businessUser = async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${'account-identity:' + identity.supabaseUserId}, 0))`);
      let row = await tx.user.findUnique({ where: { supabaseUserId: identity.supabaseUserId } });
      if (!row) row = await tx.user.create({ data: { supabaseUserId: identity.supabaseUserId, scope: this.scope } });
      if (row.disabledAt || row.scope !== this.scope) throw invalid();
      return row;
    };
    const user = transaction ? await businessUser(transaction) : await this.database.client.$transaction(businessUser);
    const access = Object.freeze({ userId: user.id, scope: user.scope, emailVerified: identity.emailVerified }) as AccountAccess;
    proofs.set(access, { issuer: this, supabaseUserId: identity.supabaseUserId,
      supabaseSessionId: identity.supabaseSessionId, expiresAt: identity.expiresAt.getTime() });
    return access;
  }
  attachSession(access: AccountAccess, id: string, digest: string) {
    const proof = this.identity(access);
    proof.localSession = { id, digest };
    return access;
  }
  identity(access: AccountAccess) {
    const proof = typeof access === 'object' && access !== null ? proofs.get(access) : undefined;
    if (!proof || proof.issuer !== this || access.scope !== this.scope) throw new ApiException('FORBIDDEN', '需要有效的账户访问授权', 403);
    if (proof.expiresAt <= Date.now()) throw invalid();
    return proof;
  }
  async fresh(access: AccountAccess, tx?: Prisma.TransactionClient) {
    const proof = this.identity(access), source = tx ?? this.database.client;
    if (proof.localSession) {
      // Account session precedes user locks; refresh/logout use the same order.
      if (tx) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.account_sessions WHERE id=${proof.localSession.id}::uuid FOR SHARE`);
      const session = await source.accountSession.findFirst({ where: { id: proof.localSession.id, tokenDigest: proof.localSession.digest,
        userId: access.userId, scope: access.scope, supabaseSessionId: proof.supabaseSessionId, revokedAt: null, expiresAt: { gt: new Date() } } });
      if (!session) throw invalid();
    }
    if (tx) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.users WHERE id=${access.userId}::uuid FOR SHARE`);
    const user = await source.user.findFirst({ where: { id: access.userId, supabaseUserId: proof.supabaseUserId, scope: access.scope, disabledAt: null } });
    if (!user) throw invalid();
    return user;
  }
  async requireVerified(access: AccountAccess, tx?: Prisma.TransactionClient) {
    const user = await this.fresh(access, tx);
    if (!access.emailVerified) throw new ApiException('EMAIL_UNVERIFIED', '请先完成邮箱验证', 403);
    return user;
  }
  async requireAdmin(access: AccountAccess, tx?: Prisma.TransactionClient) {
    const user = await this.requireVerified(access, tx);
    if (user.role !== 'ADMIN') throw new ApiException('FORBIDDEN', '需要管理员权限', 403);
    return user;
  }
}
