import { Injectable } from '@nestjs/common';
import { RedemptionRequestSchema, RedemptionResponseSchema } from '@orai/contracts/private';
import { ProductConfigurationSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { BrowserSecurityService, type BrowserMutationAccess } from './browser-security.service';
import { SessionsService } from './sessions.service';
import { RequestRateService } from './request-rate.service';
import { EntitlementMetadataService, entitlementMetadataInclude } from './entitlement-metadata.service';
import { credentialDigest } from './credentials';

@Injectable()
export class RedemptionService {
  constructor(private readonly database: DatabaseService, private readonly browser: BrowserSecurityService,
    private readonly sessions: SessionsService, private readonly rates: RequestRateService, private readonly metadata: EntitlementMetadataService) {}

  async resolve(access: BrowserMutationAccess, input: unknown) {
    const proof = this.browser.requireMutation(access), request = parseInput(RedemptionRequestSchema, input);
    const digest = credentialDigest(request.code), requestDigest = credentialDigest(JSON.stringify({ digest }));
    await this.rates.forCode(digest);
    const actorKey = 'redeem-browser:' + proof.scope + ':' + proof.browserDigest, operation = 'redemption:resolve';
    return this.database.client.$transaction(async tx => {
      this.browser.requireMutation(access);
      await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${actorKey + ':' + request.requestId}, 0))`);
      const previous = await tx.idempotentRequest.findUnique({ where: { actorKey_operation_requestId: { actorKey, operation, requestId: request.requestId } } });
      if (previous && (previous.requestDigest !== requestDigest || previous.expiresAt <= new Date())) throw new ApiException('IDEMPOTENCY_CONFLICT', '请求编号已使用或重试窗口已结束', 409);
      let code = await tx.redemptionCode.findUnique({ where: { digest } });
      if (!code || code.scope !== proof.scope) throw new ApiException('CODE_INVALID', '兑换码无效，请检查输入', 404);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.orders WHERE id = ${code.orderId}::uuid FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.redemption_codes WHERE id = ${code.id}::uuid FOR UPDATE`);
      code = await tx.redemptionCode.findUniqueOrThrow({ where: { id: code.id } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: code.orderId } });
      if (code.status === 'REVOKED' || code.revokedAt || ['REFUNDED', 'CANCELLED'].includes(order.status)) throw new ApiException('CODE_REVOKED', '兑换码已撤销，请联系售后', 410);
      if (code.status === 'EXPIRED') throw new ApiException('CODE_EXPIRED', '首次兑换期限已结束，请联系售后', 410);
      if (order.status !== 'FULFILLED') throw new ApiException('CODE_INVALID', '兑换码暂不可使用，请联系售后', 404);
      const now = new Date();
      let entitlement;
      let disposition: 'claimed' | 'restored';
      if (code.entitlementId) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id = ${code.entitlementId}::uuid FOR UPDATE`);
        entitlement = await tx.entitlement.findUniqueOrThrow({ where: { id: code.entitlementId } });
        disposition = 'restored';
        if (entitlement.ownership === 'ACCOUNT_BOUND') throw new ApiException('ACCOUNT_REQUIRED', '此权益需要使用所属账户登录', 403);
        if (entitlement.status === 'REVOKED' || entitlement.revokedAt) throw new ApiException('ENTITLEMENT_REVOKED', '权益已撤销，请联系售后', 410);
        if (entitlement.status === 'EXPIRED' || entitlement.accessExpiresAt <= now) throw new ApiException('ENTITLEMENT_EXPIRED', '权益访问期已结束', 410);
      } else {
        if (code.claimDeadline <= now) throw new ApiException('CODE_EXPIRED', '首次兑换期限已结束，请联系售后', 410);
        const version = await tx.productVersion.findUniqueOrThrow({ where: { id: code.productVersionId }, include: { product: true } });
        await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id = ${version.productId}::uuid FOR SHARE`);
        const product = await tx.product.findUniqueOrThrow({ where: { id: version.productId } });
        if (product.status !== 'PUBLISHED' || !['PUBLISHED', 'ARCHIVED'].includes(version.status)) throw new ApiException('CODE_INVALID', '商品暂不接受新的领取，请联系售后', 404);
        const configuration = parseInput(ProductConfigurationSchema, version.configuration, 'INVALID_CONFIGURATION');
        entitlement = await tx.entitlement.create({ data: { productVersionId: code.productVersionId, orderId: code.orderId,
          scope: code.scope, reportsAllowed: 1, reportsConsumed: 0, claimedAt: now,
          accessExpiresAt: new Date(now.getTime() + configuration.retention.entitlementDays * 86_400_000) } });
        await tx.redemptionCode.update({ where: { id: code.id }, data: { status: 'CLAIMED', entitlementId: entitlement.id, claimedAt: now } });
        await tx.event.create({ data: { dedupeKey: 'redemption:' + code.id, scope: code.scope, kind: 'REDEMPTION',
          source: code.scope === 'DEMO' ? 'DEMO' : 'WEB', productVersionId: code.productVersionId } });
        disposition = 'claimed';
      }
      this.browser.requireMutation(access);
      const newSession = await this.sessions.attach(tx, entitlement, proof.sessionToken);
      if (!previous) await tx.idempotentRequest.create({ data: { actorKey, operation, requestId: request.requestId,
        requestDigest, response: { entitlementId: entitlement.id }, expiresAt: new Date(now.getTime() + 86_400_000) } });
      const record = await tx.entitlement.findUniqueOrThrow({ where: { id: entitlement.id }, include: entitlementMetadataInclude });
      // New session plaintext exists only until the HTTP adapter sets its cookie.
      return { response: RedemptionResponseSchema.parse({ entitlement: this.metadata.project(record), disposition }), newSession };
    }, { maxWait: 5000, timeout: 10000 });
  }
}
