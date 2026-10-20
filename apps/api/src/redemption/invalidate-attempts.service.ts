import { Injectable } from '@nestjs/common';
import type { DataScope, Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';

@Injectable()
export class InvalidateAttemptsService {
  // T04 refunds remove existing contributions atomically. T05 writes/retention
  // must keep statsValid and the same lock order; cleanup currently is preview.
  async invalidate(tx: Prisma.TransactionClient, entitlementIds: string[], versionId: string, scope: DataScope, now: Date) {
    const attempts = await tx.attempt.findMany({ where: { entitlementId: { in: entitlementIds }, statsValid: true, scope }, orderBy: { id: 'asc' } });
    if (!attempts.length) return;
    const ids = attempts.map(value => value.id);
    for (const id of ids) await tx.$queryRawUnsafe('SELECT id FROM orai.attempts WHERE id=$1::uuid FOR UPDATE', id);
    const answers = await tx.attemptAnswer.findMany({ where: { attemptId: { in: ids } }, orderBy: [{ questionId: 'asc' }, { optionId: 'asc' }] });
    const questionCounts = new Map<string, number>(), optionCounts = new Map<string, { questionId: string; optionId: string; count: number }>();
    for (const answer of answers) {
      questionCounts.set(answer.questionId, (questionCounts.get(answer.questionId) ?? 0) + 1);
      const key = answer.questionId + ':' + answer.optionId;
      const previous = optionCounts.get(key);
      optionCounts.set(key, { questionId: answer.questionId, optionId: answer.optionId, count: (previous?.count ?? 0) + 1 });
    }
    const drift = () => new ApiException('CONFLICT', '统计记录不一致，退款尚未完成，请检查后重试', 409);
    for (const [questionId, count] of [...questionCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const changed = await tx.questionStat.updateMany({ where: { productVersionId: versionId, questionId, scope, answerCount: { gte: count } },
        data: { answerCount: { decrement: count }, updatedAt: now } });
      if (changed.count !== 1) throw drift();
    }
    for (const value of [...optionCounts.values()].sort((a, b) => (a.questionId + ':' + a.optionId).localeCompare(b.questionId + ':' + b.optionId))) {
      const changed = await tx.questionOptionStat.updateMany({ where: { productVersionId: versionId, questionId: value.questionId,
        optionId: value.optionId, count: { gte: value.count } }, data: { count: { decrement: value.count } } });
      if (changed.count !== 1) throw drift();
    }
    const completedIds = attempts.filter(value => value.completedAt !== null).map(value => value.id);
    const reports = await tx.report.findMany({ where: { attemptId: { in: completedIds }, scope }, select: { resultTypeId: true } });
    if (reports.length) {
      const changed = await tx.resultStat.updateMany({ where: { productVersionId: versionId, scope, completedCount: { gte: reports.length } },
        data: { completedCount: { decrement: reports.length }, updatedAt: now } });
      if (changed.count !== 1) throw drift();
      const types = new Map<string, number>();
      for (const report of reports) types.set(report.resultTypeId, (types.get(report.resultTypeId) ?? 0) + 1);
      for (const [resultTypeId, count] of [...types.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const updated = await tx.resultTypeStat.updateMany({ where: { productVersionId: versionId, resultTypeId, count: { gte: count } }, data: { count: { decrement: count } } });
        if (updated.count !== 1) throw drift();
      }
    }
    await tx.attempt.updateMany({ where: { id: { in: ids } }, data: { statsValid: false, invalidatedAt: now, status: 'INVALID' } });
  }
}
