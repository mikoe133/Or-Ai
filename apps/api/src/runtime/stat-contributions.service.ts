import { Injectable } from '@nestjs/common';
import type { ProductConfiguration } from '@orai/contracts/admin';
import { ApiException } from '../common/http-errors';
import { Prisma, type DataScope } from '../generated/prisma/client';

type Question = ProductConfiguration['questions'][number];
const drift = () => new ApiException('CONFLICT', '统计贡献不一致，操作尚未完成，请检查后重试', 409);

@Injectable()
export class StatContributionsService {
  async answer(tx: Prisma.TransactionClient, versionId: string, scope: DataScope, question: Question, optionId: string,
    previousOptionId: string | undefined, now: Date) {
    const parent = await tx.questionStat.upsert({ where: { productVersionId_questionId: { productVersionId: versionId, questionId: question.id } },
      create: { productVersionId: versionId, questionId: question.id, scope, answerCount: 0, updatedAt: now }, update: { updatedAt: now } });
    // Parent is locked before child rows, matching refund/feedback lock order.
    await tx.questionOptionStat.createMany({ data: question.options.map(option => ({ productVersionId: versionId, questionId: question.id, optionId: option.id, count: 0 })), skipDuplicates: true });
    const counts = await tx.questionOptionStat.findMany({ where: { productVersionId: versionId, questionId: question.id } });
    if (parent.scope !== scope || counts.some(value => !question.options.some(option => option.id === value.optionId)) ||
      counts.reduce((sum, value) => sum + value.count, 0) !== parent.answerCount) throw drift();
    if (previousOptionId) {
      if (previousOptionId === optionId) {
        if (!counts.some(value => value.optionId === optionId && value.count > 0)) throw drift();
        return;
      }
      const previous = await tx.questionOptionStat.updateMany({ where: { productVersionId: versionId, questionId: question.id, optionId: previousOptionId, count: { gte: 1 } }, data: { count: { decrement: 1 } } });
      if (previous.count !== 1) throw drift();
    } else await tx.questionStat.update({ where: { productVersionId_questionId: { productVersionId: versionId, questionId: question.id } }, data: { answerCount: { increment: 1 } } });
    await tx.questionOptionStat.update({ where: { productVersionId_questionId_optionId: { productVersionId: versionId, questionId: question.id, optionId } }, data: { count: { increment: 1 } } });
  }
  async result(tx: Prisma.TransactionClient, versionId: string, scope: DataScope, configuration: ProductConfiguration, resultTypeId: string, now: Date) {
    // Serialize the first insert as well as later increments. The two unique
    // version indexes can otherwise race before a parent counter exists.
    await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'result-contributions:' + versionId},0))`);
    const types = [...configuration.resultTypes.map(value => value.id), configuration.report.insufficient.id];
    const parent = await tx.resultStat.upsert({ where: { productVersionId: versionId }, create: { productVersionId: versionId, scope, completedCount: 0, updatedAt: now }, update: { updatedAt: now } });
    await tx.resultTypeStat.createMany({ data: types.map(id => ({ productVersionId: versionId, resultTypeId: id, count: 0 })), skipDuplicates: true });
    const counts = await tx.resultTypeStat.findMany({ where: { productVersionId: versionId } });
    if (parent.scope !== scope || !types.includes(resultTypeId) || counts.some(value => !types.includes(value.resultTypeId)) ||
      counts.reduce((sum, value) => sum + value.count, 0) !== parent.completedCount) throw drift();
    await tx.resultStat.update({ where: { productVersionId: versionId }, data: { completedCount: { increment: 1 } } });
    await tx.resultTypeStat.update({ where: { productVersionId_resultTypeId: { productVersionId: versionId, resultTypeId } }, data: { count: { increment: 1 } } });
  }
}
