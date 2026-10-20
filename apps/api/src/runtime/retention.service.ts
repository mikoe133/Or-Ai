import { Injectable } from '@nestjs/common';
import { AdminRetentionPreviewInputSchema, AdminRetentionPreviewSchema } from '@orai/contracts/admin';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { parseInput } from '../common/parse-input';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class RetentionService {
  constructor(private readonly database: DatabaseService, private readonly admin: CatalogAdminAccessService) {}

  async preview(access: CatalogAdminAccess, input: unknown) {
    const request = parseInput(AdminRetentionPreviewInputSchema, input);
    const asOf = request.asOf ? new Date(request.asOf) : new Date();
    return this.database.client.$transaction(async tx => {
      const actor = await this.admin.require(access, tx);
      const rawWhere: Prisma.AttemptWhereInput = { scope: actor.scope, status: { in: ['COMPLETED', 'INVALID'] },
        completedAt: { not: null }, answersExpireAt: { lte: asOf }, answers: { some: {} } };
      const reportWhere: Prisma.ReportWhereInput = { scope: actor.scope, expiresAt: { lte: asOf },
        deletedAt: null, snapshot: { not: Prisma.DbNull } };
      const skip = (request.page - 1) * request.pageSize, take = request.pageSize;
      // One consistent snapshot; select only candidate metadata. There is no
      // cleanup mutation or HTTP route in v1's preview implementation.
      const rawTotal = await tx.attempt.count({ where: rawWhere });
      const attempts = await tx.attempt.findMany({ where: rawWhere, skip, take,
        orderBy: [{ answersExpireAt: 'asc' }, { id: 'asc' }],
        select: { id: true, productVersionId: true, status: true, completedAt: true, answersExpireAt: true, _count: { select: { answers: true } } } });
      const reportTotal = await tx.report.count({ where: reportWhere });
      const reports = await tx.report.findMany({ where: reportWhere, skip, take,
        orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
        select: { id: true, attemptId: true, productVersionId: true, expiresAt: true } });
      return AdminRetentionPreviewSchema.parse({ dryRun: true, scope: actor.scope.toLowerCase(), asOf: asOf.toISOString(),
        rawAnswers: { page: request.page, pageSize: take, total: rawTotal, items: attempts.map(value => ({
          attemptId: value.id, versionId: value.productVersionId, status: value.status.toLowerCase(),
          completedAt: value.completedAt!.toISOString(), expiresAt: value.answersExpireAt!.toISOString(), answerCount: value._count.answers,
        })) },
        reports: { page: request.page, pageSize: take, total: reportTotal, items: reports.map(value => ({
          reportId: value.id, attemptId: value.attemptId, versionId: value.productVersionId, expiresAt: value.expiresAt.toISOString(),
        })) },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
