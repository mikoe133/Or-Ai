import { Injectable } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { AccountReportPageSchema, EntitlementPageSchema, EntitlementQuerySchema } from '@orai/contracts/private';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma, type Entitlement } from '../generated/prisma/client';
import { EntitlementMetadataService, entitlementMetadataInclude } from '../redemption/entitlement-metadata.service';
import { AccountIdentityService, type AccountAccess } from './account-identity.service';

@Injectable()
export class AccountEntitlementsService {
  constructor(private readonly database: DatabaseService, private readonly identity: AccountIdentityService,
    private readonly metadata: EntitlementMetadataService) {}

  async requireEntitlement(access: AccountAccess, input: unknown, tx?: Prisma.TransactionClient, metadataOnly = false): Promise<Entitlement> {
    this.identity.identity(access);
    const id = parseInput(IdSchema, input).toLowerCase();
    if (!tx) return this.database.client.$transaction(client => this.requireEntitlement(access, id, client, metadataOnly));
    // Runtime/refund order starts with the entitlement; account sessions then
    // users follow, and answer/report locks come after authorization.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id=${id}::uuid FOR SHARE`);
    await this.identity.requireVerified(access, tx);
    const row = await tx.entitlement.findFirst({ where: { id, scope: access.scope, ownership: 'ACCOUNT_BOUND', ownerUserId: access.userId } });
    if (!row) throw new ApiException('NOT_FOUND', '权益不存在于当前账户中', 404);
    if (row.status === 'REVOKED' || row.revokedAt) throw new ApiException('ENTITLEMENT_REVOKED', '权益已撤销，请联系售后', 410);
    if (!metadataOnly && (row.status === 'EXPIRED' || row.accessExpiresAt <= new Date())) throw new ApiException('ENTITLEMENT_EXPIRED', '权益访问期已结束', 410);
    return row;
  }
  async readMetadata(access: AccountAccess, input: unknown) {
    const id = parseInput(IdSchema, input).toLowerCase();
    return this.database.client.$transaction(async tx => {
      await this.requireEntitlement(access, id, tx, true);
      return this.metadata.project(await tx.entitlement.findUniqueOrThrow({ where: { id }, include: entitlementMetadataInclude }));
    });
  }
  async list(access: AccountAccess, input: unknown) {
    const query = parseInput(EntitlementQuerySchema, input);
    return this.database.client.$transaction(async tx => {
      await this.identity.requireVerified(access, tx);
      const where: Prisma.EntitlementWhereInput = { scope: access.scope, ownership: 'ACCOUNT_BOUND', ownerUserId: access.userId };
      const total = await tx.entitlement.count({ where });
      const rows = await tx.entitlement.findMany({ where, include: entitlementMetadataInclude,
        orderBy: [{ claimedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize });
      return EntitlementPageSchema.parse({ items: rows.map(row => this.metadata.project(row)), total, page: query.page, pageSize: query.pageSize });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async reports(access: AccountAccess, input: unknown) {
    const query = parseInput(EntitlementQuerySchema, input);
    return this.database.client.$transaction(async tx => {
      await this.identity.requireVerified(access, tx);
      const where: Prisma.ReportWhereInput = { scope: access.scope,
        attempt: { scope: access.scope, entitlement: { scope: access.scope, ownership: 'ACCOUNT_BOUND', ownerUserId: access.userId } } };
      const total = await tx.report.count({ where });
      const rows = await tx.report.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize,
        select: { id: true, productVersionId: true, scope: true, createdAt: true, expiresAt: true, deletedAt: true,
          productVersion: { select: { number: true, product: { select: { name: true } } } },
          attempt: { select: { entitlementId: true, entitlement: { select: { status: true, accessExpiresAt: true, revokedAt: true } } } } } });
      const now = new Date();
      return AccountReportPageSchema.parse({ items: rows.map(row => ({ id: row.id, entitlementId: row.attempt.entitlementId,
        productName: row.productVersion.product.name, versionId: row.productVersionId, versionNumber: row.productVersion.number,
        createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), isDemo: row.scope === 'DEMO',
        reportState: row.deletedAt ? 'deleted' : row.expiresAt <= now ? 'expired' : 'available',
        entitlementStatus: row.attempt.entitlement.status === 'REVOKED' || row.attempt.entitlement.revokedAt ? 'revoked'
          : row.attempt.entitlement.status === 'EXPIRED' || row.attempt.entitlement.accessExpiresAt <= now ? 'expired' : 'active' })),
        total, page: query.page, pageSize: query.pageSize });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
