import { Injectable } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { DeleteReportRequestSchema, ReportResponseSchema } from '@orai/contracts/private';
import { legacyReportPresentation } from '@orai/contracts/experience';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma, type Report } from '../generated/prisma/client';
import { ConsumerAccessService, type ConsumerActor } from './consumer-access.service';
import { runtimeRequest, previousRequest, rememberRequest } from './runtime-idempotency';

export function reportResponse(report: Report) {
  if (report.deletedAt || report.snapshot === null) throw new ApiException('REPORT_DELETED', '报告已删除，无法恢复内容', 410);
  if (report.expiresAt <= new Date()) throw new ApiException('REPORT_EXPIRED', '报告保存期已结束', 410);
  return ReportResponseSchema.parse({ id: report.id, attemptId: report.attemptId, versionId: report.productVersionId,
    content: report.snapshot, presentation: report.presentation ?? legacyReportPresentation,
    createdAt: report.createdAt.toISOString(), expiresAt: report.expiresAt.toISOString() });
}

@Injectable()
export class ReportsService {
  constructor(private readonly database: DatabaseService, private readonly access: ConsumerAccessService) {}
  read(actor: ConsumerActor, input: unknown) {
    return this.database.client.$transaction(async tx => reportResponse(await this.access.requireReport(actor, input, tx)));
  }
  async remove(actor: ConsumerActor, input: unknown, body: unknown) {
    this.access.identity(actor);
    const id = parseInput(IdSchema, input).toLowerCase(), request = parseInput(DeleteReportRequestSchema, body);
    await this.database.client.$transaction(async tx => {
      const reference = await tx.report.findFirst({ where: { id, scope: actor.scope }, select: { attempt: { select: { entitlementId: true } } } });
      if (!reference) throw new ApiException('NOT_FOUND', '报告不存在于当前授权中', 404);
      const entitlementId = reference.attempt.entitlementId;
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id=${entitlementId}::uuid FOR UPDATE`);
      await this.access.requireEntitlement(actor, entitlementId, tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.reports WHERE id=${id}::uuid FOR UPDATE`);
      const record = await tx.report.findUniqueOrThrow({ where: { id } });
      const key = runtimeRequest(actor.scope, entitlementId, 'delete-report:' + id, request.requestId, {});
      if (await previousRequest(tx, key)) return;
      if (!record.deletedAt) await tx.report.update({ where: { id }, data: { snapshot: Prisma.DbNull, deletedAt: new Date() } });
      // Deletion retains usage and anonymous aggregate contribution, never a
      // snapshot in the retry cache. Refund still removes the contribution.
      await rememberRequest(tx, key, { reportId: id, deleted: true });
    });
  }
}
