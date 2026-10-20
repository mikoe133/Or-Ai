import { Injectable } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { EntitlementPageSchema, EntitlementQuerySchema } from '@orai/contracts/private';
import { DatabaseService } from '../database/database.service';
import { Prisma, type Attempt, type Entitlement, type Report } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { SessionsService, type AnonymousAccess } from './sessions.service';
import { EntitlementMetadataService, entitlementMetadataInclude } from './entitlement-metadata.service';

@Injectable()
export class EntitlementAccessService {
  constructor(private readonly database: DatabaseService, private readonly sessions: SessionsService,
    private readonly metadata: EntitlementMetadataService) {}

  async requireEntitlement(access: AnonymousAccess, input: unknown, tx?: Prisma.TransactionClient, metadataOnly = false): Promise<Entitlement> {
    this.sessions.identity(access);
    const id = parseInput(IdSchema, input).toLowerCase();
    if (!tx) return this.database.client.$transaction(client => this.requireEntitlement(access, id, client, metadataOnly));
    // Shared convention for T04/T05/T06: entitlement -> session -> grant ->
    // attempt/statistics. A refund cannot overtake an authorized write.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id = ${id}::uuid FOR SHARE`);
    await this.sessions.fresh(access, tx);
    const grant = await tx.accessGrant.findUnique({ where: { sessionId_entitlementId: { sessionId: access.sessionId, entitlementId: id } } });
    if (!grant || grant.scope !== access.scope) throw new ApiException('NOT_FOUND', '权益不存在于当前授权中', 404);
    const entitlement = await tx.entitlement.findFirst({ where: { id, scope: access.scope } });
    if (!entitlement) throw new ApiException('NOT_FOUND', '权益不存在于当前授权中', 404);
    if (entitlement.ownership === 'ACCOUNT_BOUND') throw new ApiException('ACCOUNT_REQUIRED', '此权益需要使用所属账户登录', 403);
    if (entitlement.status === 'REVOKED' || entitlement.revokedAt) throw new ApiException('ENTITLEMENT_REVOKED', '权益已撤销，请联系售后', 410);
    if (grant.revokedAt) throw new ApiException('FORBIDDEN', '访问授权已更新，请凭有效兑换码恢复', 403);
    if (!metadataOnly && (entitlement.status === 'EXPIRED' || entitlement.accessExpiresAt <= new Date())) throw new ApiException('ENTITLEMENT_EXPIRED', '权益访问期已结束', 410);
    return entitlement;
  }
  async requireAttempt(access: AnonymousAccess, input: unknown, tx?: Prisma.TransactionClient): Promise<Attempt> {
    this.sessions.identity(access);
    const id = parseInput(IdSchema, input).toLowerCase();
    if (!tx) return this.database.client.$transaction(client => this.requireAttempt(access, id, client));
    const attempt = await tx.attempt.findFirst({ where: { id, scope: access.scope } });
    if (!attempt) throw new ApiException('NOT_FOUND', '答卷不存在于当前授权中', 404);
    await this.requireEntitlement(access, attempt.entitlementId, tx);
    return attempt;
  }
  async requireReport(access: AnonymousAccess, input: unknown, tx?: Prisma.TransactionClient): Promise<Report> {
    this.sessions.identity(access);
    const id = parseInput(IdSchema, input).toLowerCase();
    if (!tx) return this.database.client.$transaction(client => this.requireReport(access, id, client));
    let report = await tx.report.findFirst({ where: { id, scope: access.scope } });
    if (!report) throw new ApiException('NOT_FOUND', '报告不存在于当前授权中', 404);
    await this.requireAttempt(access, report.attemptId, tx);
    report = await tx.report.findFirstOrThrow({ where: { id, scope: access.scope } });
    if (report.deletedAt || report.snapshot === null) throw new ApiException('REPORT_DELETED', '报告已删除，无法恢复内容', 410);
    if (report.expiresAt <= new Date()) throw new ApiException('REPORT_EXPIRED', '报告保存期已结束', 410);
    return report;
  }
  async readMetadata(access: AnonymousAccess, input: unknown) {
    const id = parseInput(IdSchema, input).toLowerCase();
    return this.database.client.$transaction(async tx => {
      await this.requireEntitlement(access, id, tx, true);
      return this.metadata.project(await tx.entitlement.findUniqueOrThrow({ where: { id }, include: entitlementMetadataInclude }));
    });
  }
  async list(access: AnonymousAccess, input: unknown = {}) {
    const query = parseInput(EntitlementQuerySchema, input);
    this.sessions.identity(access);
    return this.database.client.$transaction(async tx => {
      await this.sessions.fresh(access, tx);
      const where: Prisma.AccessGrantWhereInput = { sessionId: access.sessionId, scope: access.scope, revokedAt: null,
        entitlement: { scope: access.scope, ownership: 'ANONYMOUS' } };
      const total = await tx.accessGrant.count({ where });
      const grants = await tx.accessGrant.findMany({ where, orderBy: [{ createdAt: 'desc' }, { entitlementId: 'asc' }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize,
        select: { entitlement: { include: entitlementMetadataInclude } } });
      return EntitlementPageSchema.parse({ items: grants.map(value => this.metadata.project(value.entitlement)), total,
        page: query.page, pageSize: query.pageSize });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
