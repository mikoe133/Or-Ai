import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { IdSchema } from '@orai/contracts';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma } from '../generated/prisma/client';
import { SessionsService, type AnonymousAccess } from '../redemption/sessions.service';
import { EntitlementAccessService } from '../redemption/entitlement-access.service';
import { credentialDigest } from '../redemption/credentials';
import { AccountIdentityService, type AccountAccess } from '../accounts/account-identity.service';
import { AccountSessionsService } from '../accounts/account-sessions.service';
import { AccountCookiesService } from '../accounts/account-cookies.service';
import { AccountEntitlementsService } from '../accounts/account-entitlements.service';

export type ConsumerActor = AnonymousAccess | AccountAccess;

@Injectable()
export class ConsumerAccessService {
  constructor(private readonly database: DatabaseService, private readonly anonymous: SessionsService,
    private readonly anonymousEntitlements: EntitlementAccessService, private readonly accounts: AccountSessionsService,
    private readonly identityService: AccountIdentityService, private readonly cookies: AccountCookiesService,
    private readonly accountEntitlements: AccountEntitlementsService, @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}
  identity(actor: ConsumerActor) {
    if (typeof actor === 'object' && actor !== null && 'userId' in actor) return this.identityService.identity(actor);
    return this.anonymous.identity(actor as AnonymousAccess);
  }
  async forRequest(request: Request, resource: 'entitlement' | 'attempt' | 'report', input: unknown): Promise<ConsumerActor> {
    const id = parseInput(IdSchema, input).toLowerCase(), scope = this.configuration.environment === 'production' ? 'LIVE' : 'DEMO';
    const anonymous = await this.anonymous.fromRequest(request), accountToken = this.cookies.read(request);
    // Checking local credential existence here never grants account access.
    // Remote verification is only needed when the requested product is bound.
    const localAccount = accountToken && this.accounts.configured ? await this.database.client.accountSession.findFirst({
      where: { tokenDigest: credentialDigest(accountToken), scope, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } }) : null;
    if (!anonymous && !localAccount) throw new ApiException('AUTH_REQUIRED', '请先登录或恢复兑换权益', 401);
    const reference = resource === 'entitlement'
      ? await this.database.client.entitlement.findFirst({ where: { id, scope }, select: { ownership: true } })
      : resource === 'attempt'
        ? (await this.database.client.attempt.findFirst({ where: { id, scope }, select: { entitlement: { select: { ownership: true } } } }))?.entitlement
        : (await this.database.client.report.findFirst({ where: { id, scope }, select: { attempt: { select: { entitlement: { select: { ownership: true } } } } } }))?.attempt.entitlement;
    if (!reference) throw new ApiException('NOT_FOUND', '内容不存在于当前授权中', 404);
    if (reference.ownership === 'ACCOUNT_BOUND') {
      if (!accountToken) throw new ApiException('ACCOUNT_REQUIRED', '此权益需要使用所属账户登录', 403);
      return this.accounts.requireRequest(request);
    }
    if (!anonymous) throw new ApiException('AUTH_REQUIRED', '请先兑换或恢复本机权益，登录不会自动绑定商品', 401);
    return anonymous;
  }
  async requireEntitlement(actor: ConsumerActor, input: unknown, tx: Prisma.TransactionClient, metadataOnly = false) {
    this.identity(actor);
    return 'userId' in actor ? this.accountEntitlements.requireEntitlement(actor, input, tx, metadataOnly)
      : this.anonymousEntitlements.requireEntitlement(actor, input, tx, metadataOnly);
  }
  async requireReport(actor: ConsumerActor, input: unknown, tx: Prisma.TransactionClient) {
    this.identity(actor);
    if (!('userId' in actor)) return this.anonymousEntitlements.requireReport(actor, input, tx);
    const id = parseInput(IdSchema, input).toLowerCase();
    const reference = await tx.report.findFirst({ where: { id, scope: actor.scope }, select: { attempt: { select: { entitlementId: true } } } });
    if (!reference) throw new ApiException('NOT_FOUND', '报告不存在于当前授权中', 404);
    await this.requireEntitlement(actor, reference.attempt.entitlementId, tx);
    // The shared entitlement lock also prevents deletion from overtaking this
    // read: report deletion first takes an exclusive entitlement lock.
    const report = await tx.report.findFirstOrThrow({ where: { id, scope: actor.scope } });
    if (report.deletedAt || report.snapshot === null) throw new ApiException('REPORT_DELETED', '报告已删除，无法恢复内容', 410);
    if (report.expiresAt <= new Date()) throw new ApiException('REPORT_EXPIRED', '报告保存期已结束', 410);
    return report;
  }
}
