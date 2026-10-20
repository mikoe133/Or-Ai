import { Injectable } from '@nestjs/common';
import { BindEntitlementRequestSchema, RedemptionResponseSchema } from '@orai/contracts/private';
import { ProductConfigurationSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma } from '../generated/prisma/client';
import { BrowserSecurityService, type BrowserMutationAccess } from '../redemption/browser-security.service';
import { SessionsService } from '../redemption/sessions.service';
import { EntitlementAccessService } from '../redemption/entitlement-access.service';
import { EntitlementMetadataService, entitlementMetadataInclude } from '../redemption/entitlement-metadata.service';
import { RequestRateService } from '../redemption/request-rate.service';
import { credentialDigest } from '../redemption/credentials';
import { AccountIdentityService, type AccountAccess } from './account-identity.service';

const codeInvalid = () => new ApiException('CODE_INVALID', '兑换码无效，请检查输入', 404);

@Injectable()
export class AccountBindingService {
  constructor(private readonly database: DatabaseService, private readonly identity: AccountIdentityService,
    private readonly browser: BrowserSecurityService, private readonly sessions: SessionsService,
    private readonly anonymousEntitlements: EntitlementAccessService, private readonly metadata: EntitlementMetadataService,
    private readonly rates: RequestRateService) {}

  async resolve(account: AccountAccess, mutation: BrowserMutationAccess, input: unknown, mode: 'bind' | 'redeem') {
    this.identity.identity(account);
    const proof = this.browser.requireMutation(mutation), body = parseInput(BindEntitlementRequestSchema, input);
    if (proof.scope !== account.scope) throw new ApiException('FORBIDDEN', '授权范围不一致', 403);
    const digest = credentialDigest(body.code), requestDigest = credentialDigest(JSON.stringify({ digest, confirmed: true }));
    await this.rates.forCode(digest);
    const anonymous = await this.sessions.fromToken(proof.sessionToken);
    const actorKey = 'account-code:' + account.scope + ':' + account.userId, operation = 'account:' + mode, requestId = body.requestId.toLowerCase();
    return this.database.client.$transaction(async tx => {
      this.browser.requireMutation(mutation);
      await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${actorKey + ':' + operation + ':' + requestId}, 0))`);
      const previous = await tx.idempotentRequest.findUnique({ where: { actorKey_operation_requestId: { actorKey, operation, requestId } } });
      if (previous && (previous.requestDigest !== requestDigest || previous.expiresAt <= new Date())) throw new ApiException('IDEMPOTENCY_CONFLICT', '请求编号已使用或重试窗口已结束', 409);
      let code = await tx.redemptionCode.findUnique({ where: { digest } });
      if (!code || code.scope !== account.scope) throw codeInvalid();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.orders WHERE id=${code.orderId}::uuid FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.redemption_codes WHERE id=${code.id}::uuid FOR UPDATE`);
      code = await tx.redemptionCode.findUniqueOrThrow({ where: { id: code.id } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: code.orderId } });
      if (code.status === 'REVOKED' || code.revokedAt || ['REFUNDED', 'CANCELLED'].includes(order.status)) throw new ApiException('CODE_REVOKED', '兑换码已撤销，请联系售后', 410);
      if (code.status === 'EXPIRED') throw new ApiException('CODE_EXPIRED', '首次兑换期限已结束，请联系售后', 410);
      if (order.status !== 'FULFILLED') throw codeInvalid();
      const now = new Date();
      let entitlement;
      let disposition: 'claimed' | 'restored' = 'restored';
      if (code.entitlementId) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id=${code.entitlementId}::uuid FOR UPDATE`);
        entitlement = await tx.entitlement.findUniqueOrThrow({ where: { id: code.entitlementId } });
      } else {
        if (mode === 'bind') throw new ApiException('CONFLICT', '请先匿名领取，或选择确认兑换到当前账户', 409);
        if (code.claimDeadline <= now) throw new ApiException('CODE_EXPIRED', '首次兑换期限已结束，请联系售后', 410);
        const version = await tx.productVersion.findUniqueOrThrow({ where: { id: code.productVersionId } });
        await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${version.productId}::uuid FOR SHARE`);
        const product = await tx.product.findUniqueOrThrow({ where: { id: version.productId } });
        if (product.status !== 'PUBLISHED' || !['PUBLISHED', 'ARCHIVED'].includes(version.status)) throw codeInvalid();
        const configuration = parseInput(ProductConfigurationSchema, version.configuration, 'INVALID_CONFIGURATION');
        entitlement = await tx.entitlement.create({ data: { productVersionId: code.productVersionId, orderId: code.orderId, scope: account.scope,
          reportsAllowed: 1, reportsConsumed: 0, claimedAt: now, accessExpiresAt: new Date(now.getTime() + configuration.retention.entitlementDays * 86_400_000) } });
        await tx.redemptionCode.update({ where: { id: code.id }, data: { status: 'CLAIMED', entitlementId: entitlement.id, claimedAt: now } });
        await tx.event.create({ data: { dedupeKey: 'redemption:' + code.id, scope: account.scope, kind: 'REDEMPTION',
          source: account.scope === 'DEMO' ? 'DEMO' : 'WEB', productVersionId: code.productVersionId } });
        disposition = 'claimed';
      }
      await this.identity.requireVerified(account, tx);
      if (entitlement.ownership === 'ACCOUNT_BOUND' && entitlement.ownerUserId !== account.userId) {
        throw new ApiException('ACCOUNT_REQUIRED', '兑换码已绑定账户，请使用所属账户登录', 403);
      }
      if (entitlement.status === 'REVOKED' || entitlement.revokedAt) throw new ApiException('ENTITLEMENT_REVOKED', '权益已撤销，请联系售后', 410);
      if (entitlement.status === 'EXPIRED' || entitlement.accessExpiresAt <= now) throw new ApiException('ENTITLEMENT_EXPIRED', '权益访问期已结束', 410);
      if (entitlement.ownership === 'ANONYMOUS') {
        if (disposition !== 'claimed') {
          if (!anonymous) throw new ApiException('AUTH_REQUIRED', '需要当前有效的匿名授权及对应兑换码，请先恢复本机权益', 401);
          // Acquire exclusive session locks before fresh() takes shared locks.
          // Two products in one browser must not deadlock on a lock upgrade.
          await this.sessions.lockEntitlementSessions(tx, [entitlement.id]);
          await this.anonymousEntitlements.requireEntitlement(anonymous, entitlement.id, tx);
        }
        await tx.entitlement.update({ where: { id: entitlement.id }, data: { ownership: 'ACCOUNT_BOUND', ownerUserId: account.userId, boundAt: now } });
        await tx.entitlementBinding.create({ data: { entitlementId: entitlement.id, userId: account.userId, createdAt: now } });
        await this.sessions.revokeEntitlementGrants(tx, [entitlement.id], now);
      }
      this.browser.requireMutation(mutation);
      if (!previous) await tx.idempotentRequest.create({ data: { actorKey, operation, requestId, requestDigest,
        response: { entitlementId: entitlement.id }, expiresAt: new Date(now.getTime() + 86_400_000) } });
      const record = await tx.entitlement.findUniqueOrThrow({ where: { id: entitlement.id }, include: entitlementMetadataInclude });
      return RedemptionResponseSchema.parse({ entitlement: this.metadata.project(record), disposition });
    }, { maxWait: 5000, timeout: 15000 });
  }
}
