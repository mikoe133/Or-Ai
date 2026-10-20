import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IdSchema } from '@orai/contracts';
import { AdminCreateOrderSchema, AdminDeliveryActionSchema, AdminOrderSchema, AdminDeliveryReceiptSchema, AdminSecretDeliverySchema, ProductConfigurationSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { Prisma, type Order } from '../generated/prisma/client';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { credentialDigest, newCredential } from './credentials';
import { SessionsService } from './sessions.service';
import { InvalidateAttemptsService } from './invalidate-attempts.service';

const orderDto = (order: Order) => AdminOrderSchema.parse({ id: order.id, platform: order.platform.toLowerCase(), reference: order.reference,
  productVersionId: order.productVersionId, scope: order.scope.toLowerCase(), quantity: order.quantity, amountFen: order.amountFen,
  status: order.status.toLowerCase(), createdAt: order.createdAt.toISOString(), refundedAt: order.refundedAt?.toISOString() ?? null });

@Injectable()
export class DeliveryAdminService {
  constructor(private readonly database: DatabaseService, private readonly administrators: CatalogAdminAccessService,
    private readonly sessions: SessionsService, private readonly invalidation: InvalidateAttemptsService) {}

  private async mutate<T extends object>(access: CatalogAdminAccess, operation: string, requestId: string, payload: unknown,
    work: (tx: Prisma.TransactionClient) => Promise<{ response: T; entityId: string; entityKind: string; audit?: boolean }>) {
    await this.administrators.require(access);
    const actorKey = 'delivery-admin:' + access.scope + ':' + access.actorUserId, digest = credentialDigest(JSON.stringify(payload));
    return this.database.client.$transaction(async tx => {
      await this.administrators.require(access, tx);
      await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${actorKey + ':' + operation + ':' + requestId}, 0))`);
      const previous = await tx.idempotentRequest.findUnique({ where: { actorKey_operation_requestId: { actorKey, operation, requestId } } });
      if (previous) {
        if (previous.requestDigest !== digest || previous.expiresAt <= new Date()) throw new ApiException('IDEMPOTENCY_CONFLICT', '请求编号已使用或重试窗口已结束', 409);
        return { response: previous.response as T, replayed: true };
      }
      const changed = await work(tx);
      if (changed.audit !== false) await tx.adminAuditLog.create({ data: { actorUserId: access.actorUserId, scope: access.scope,
        action: operation.split(':').slice(0, 2).join('.'), entityId: changed.entityId, entityKind: changed.entityKind, requestId } });
      await tx.idempotentRequest.create({ data: { actorKey, operation, requestId, requestDigest: digest,
        response: changed.response as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 86_400_000) } });
      return { response: changed.response, replayed: false };
    }, { maxWait: 5000, timeout: 15000 });
  }
  private async lockedOrder(tx: Prisma.TransactionClient, access: CatalogAdminAccess, id: string) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.orders WHERE id=${id}::uuid FOR UPDATE`);
    const order = await tx.order.findUnique({ where: { id } });
    if (!order || order.scope !== access.scope) throw new ApiException('NOT_FOUND', '订单不存在于当前管理范围', 404);
    return order;
  }
  private async usableVersion(tx: Prisma.TransactionClient, access: CatalogAdminAccess, versionId: string, publishingRequired: boolean) {
    const version = await tx.productVersion.findFirst({ where: { id: versionId, scope: access.scope } });
    if (!version || !['PUBLISHED', 'ARCHIVED'].includes(version.status)) throw new ApiException('CONFLICT', '订单需要一个可用的已发布版本', 409);
    if (publishingRequired) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${version.productId}::uuid FOR SHARE`);
      const product = await tx.product.findUniqueOrThrow({ where: { id: version.productId } });
      if (product.status !== 'PUBLISHED') throw new ApiException('CONFLICT', '商品暂不接受新的交付', 409);
    }
    return parseInput(ProductConfigurationSchema, version.configuration, 'INVALID_CONFIGURATION');
  }

  async recordOrder(access: CatalogAdminAccess, input: unknown) {
    await this.administrators.require(access);
    const parsed = parseInput(AdminCreateOrderSchema, input);
    const request = { ...parsed, productVersionId: parsed.productVersionId.toLowerCase(), requestId: parsed.requestId.toLowerCase() };
    if (request.scope !== access.scope.toLowerCase()) throw new ApiException('FORBIDDEN', '订单范围与管理权限不一致', 403);
    const result = await this.mutate(access, 'delivery:order:' + request.platform + ':' + request.reference, request.requestId, request, async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${request.platform + ':' + request.reference}, 0))`);
      const platform = request.platform.toUpperCase() as Order['platform'];
      const previous = await tx.order.findUnique({ where: { platform_reference: { platform, reference: request.reference } } });
      if (previous) {
        if (previous.scope !== access.scope || previous.productVersionId !== request.productVersionId || previous.quantity !== request.quantity || previous.amountFen !== request.amountFen) {
          throw new ApiException('CONFLICT', '订单引用已存在且内容不同，请核对订单', 409);
        }
        return { response: orderDto(previous), entityId: previous.id, entityKind: 'order', audit: false };
      }
      await this.usableVersion(tx, access, request.productVersionId, true);
      const order = await tx.order.create({ data: { platform, reference: request.reference, productVersionId: request.productVersionId,
        scope: access.scope, quantity: request.quantity, amountFen: request.amountFen, status: 'PENDING' } });
      return { response: orderDto(order), entityId: order.id, entityKind: 'order' };
    });
    return AdminOrderSchema.parse(result.response);
  }

  async issueOrder(access: CatalogAdminAccess, orderId: unknown, input: unknown) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, orderId).toLowerCase(), request = parseInput(AdminDeliveryActionSchema, input);
    let deliveries: { id: string; code: string; claimDeadline: string }[] = [];
    const result = await this.mutate(access, 'delivery:issue:' + id, request.requestId.toLowerCase(), {}, async tx => {
      const order = await this.lockedOrder(tx, access, id);
      if (!['PENDING', 'FULFILLED'].includes(order.status)) throw new ApiException('CONFLICT', '订单已取消或退款，不能发码', 409);
      if (await tx.redemptionCode.count({ where: { orderId: id, replacesCodeId: null } })) throw new ApiException('CONFLICT', '订单已经发码，请查询原批次或核单补发', 409);
      const config = await this.usableVersion(tx, access, order.productVersionId, true);
      const now = new Date(), deadline = new Date(now.getTime() + config.retention.firstRedemptionDays * 86_400_000);
      const batch = await tx.codeBatch.create({ data: { orderId: id, scope: order.scope } });
      deliveries = Array.from({ length: order.quantity }, () => ({ id: randomUUID(), code: newCredential(), claimDeadline: deadline.toISOString() }));
      await tx.redemptionCode.createMany({ data: deliveries.map(value => ({ id: value.id, digest: credentialDigest(value.code),
        orderId: id, productVersionId: order.productVersionId, scope: order.scope, batchId: batch.id, claimDeadline: deadline })) });
      await tx.order.update({ where: { id }, data: { status: 'FULFILLED' } });
      const receipt = AdminDeliveryReceiptSchema.parse({ orderId: id, batchId: batch.id, productVersionId: order.productVersionId,
        scope: order.scope.toLowerCase(), codeIds: deliveries.map(value => value.id), replacedCodeId: null, createdAt: now.toISOString() });
      return { response: receipt, entityId: batch.id, entityKind: 'code_batch' };
    });
    return AdminSecretDeliverySchema.parse({ receipt: result.response, deliveryAvailable: !result.replayed, deliveries: result.replayed ? [] : deliveries });
  }

  async replaceCode(access: CatalogAdminAccess, codeId: unknown, input: unknown) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, codeId).toLowerCase(), request = parseInput(AdminDeliveryActionSchema, input);
    let deliveries: { id: string; code: string; claimDeadline: string }[] = [];
    const result = await this.mutate(access, 'delivery:replace:' + id, request.requestId.toLowerCase(), {}, async tx => {
      const original = await tx.redemptionCode.findFirst({ where: { id, scope: access.scope } });
      if (!original) throw new ApiException('NOT_FOUND', '兑换码记录不存在于当前管理范围', 404);
      const order = await this.lockedOrder(tx, access, original.orderId);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.redemption_codes WHERE id=${id}::uuid FOR UPDATE`);
      const old = await tx.redemptionCode.findUniqueOrThrow({ where: { id } });
      if (order.status !== 'FULFILLED' || old.status === 'REVOKED' || await tx.redemptionCode.count({ where: { replacesCodeId: id } })) {
        throw new ApiException('CONFLICT', '该订单或旧码不符合补发条件，请核对记录', 409);
      }
      const now = new Date(), config = await this.usableVersion(tx, access, old.productVersionId, false);
      const deadline = new Date(now.getTime() + config.retention.firstRedemptionDays * 86_400_000);
      let claimedAt: Date | null = null;
      if (old.entitlementId) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id=${old.entitlementId}::uuid FOR UPDATE`);
        const entitlement = await tx.entitlement.findUniqueOrThrow({ where: { id: old.entitlementId } });
        if (entitlement.status === 'REVOKED' || entitlement.revokedAt) throw new ApiException('ENTITLEMENT_REVOKED', '原权益已撤销，不能重新发放', 410);
        if (entitlement.status === 'EXPIRED' || entitlement.accessExpiresAt <= now) throw new ApiException('ENTITLEMENT_EXPIRED', '补发不能延长原权益访问期', 410);
        claimedAt = entitlement.claimedAt;
        await this.sessions.revokeEntitlementGrants(tx, [entitlement.id], now);
        await tx.redemptionCode.updateMany({ where: { entitlementId: entitlement.id, status: { not: 'REVOKED' } }, data: { status: 'REVOKED', revokedAt: now } });
      } else await tx.redemptionCode.update({ where: { id }, data: { status: 'REVOKED', revokedAt: now } });
      const batch = await tx.codeBatch.create({ data: { orderId: order.id, scope: old.scope } });
      const value = { id: randomUUID(), code: newCredential(), claimDeadline: deadline.toISOString() };
      await tx.redemptionCode.create({ data: { id: value.id, digest: credentialDigest(value.code), scope: old.scope,
        orderId: order.id, productVersionId: old.productVersionId, batchId: batch.id, entitlementId: old.entitlementId,
        replacesCodeId: old.id, claimDeadline: deadline, status: old.entitlementId ? 'CLAIMED' : 'ISSUED', claimedAt } });
      deliveries = [value];
      const receipt = AdminDeliveryReceiptSchema.parse({ orderId: order.id, batchId: batch.id, productVersionId: old.productVersionId,
        scope: old.scope.toLowerCase(), codeIds: [value.id], replacedCodeId: id, createdAt: now.toISOString() });
      return { response: receipt, entityId: value.id, entityKind: 'redemption_code' };
    });
    return AdminSecretDeliverySchema.parse({ receipt: result.response, deliveryAvailable: !result.replayed, deliveries: result.replayed ? [] : deliveries });
  }

  async refundOrder(access: CatalogAdminAccess, orderId: unknown, input: unknown) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, orderId).toLowerCase(), request = parseInput(AdminDeliveryActionSchema, input);
    const result = await this.mutate(access, 'delivery:refund:' + id, request.requestId.toLowerCase(), {}, async tx => {
      const order = await this.lockedOrder(tx, access, id);
      if (order.status === 'REFUNDED') return { response: orderDto(order), entityId: id, entityKind: 'order', audit: false };
      if (order.status === 'CANCELLED') throw new ApiException('CONFLICT', '订单已经取消，请核对记录', 409);
      const now = new Date();
      const entitlements = await tx.entitlement.findMany({ where: { orderId: id }, orderBy: { id: 'asc' }, select: { id: true } });
      const ids = entitlements.map(value => value.id);
      for (const entitlementId of ids) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id=${entitlementId}::uuid FOR UPDATE`);
      // Session locks precede attempt/statistics locks, matching consumer writes.
      await this.sessions.revokeEntitlementGrants(tx, ids, now);
      await this.invalidation.invalidate(tx, ids, order.productVersionId, order.scope, now);
      await tx.redemptionCode.updateMany({ where: { orderId: id, status: { not: 'REVOKED' } }, data: { status: 'REVOKED', revokedAt: now } });
      await tx.entitlement.updateMany({ where: { orderId: id, status: { not: 'REVOKED' } }, data: { status: 'REVOKED', revokedAt: now } });
      const refunded = await tx.order.update({ where: { id }, data: { status: 'REFUNDED', refundedAt: now } });
      await tx.event.create({ data: { dedupeKey: 'refund:' + id, scope: order.scope, kind: 'REFUND',
        source: order.scope === 'DEMO' ? 'DEMO' : 'MANUAL', productVersionId: order.productVersionId } });
      return { response: orderDto(refunded), entityId: id, entityKind: 'order' };
    });
    return AdminOrderSchema.parse(result.response);
  }
}
