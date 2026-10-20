import { Injectable } from '@nestjs/common';
import { KeySchema } from '@orai/contracts';
import { DistributionSchema, FeedbackSchema } from '@orai/contracts/private';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import type { ConsumerActor } from './consumer-access.service';
import { OwnedRuntimeService } from './owned-runtime.service';

function distribution(choices: { id: string; label: string }[], stored: Map<string, number>, total: number, ownId: string | undefined,
  minimumSampleSize: number, denominator: 'other_valid_answers' | 'other_valid_completed_attempts') {
  if (total < 0 || [...stored.keys()].some(key => !choices.some(choice => choice.id === key)) ||
    [...stored.values()].some(value => value < 0) || [...stored.values()].reduce((sum, value) => sum + value, 0) !== total ||
    ownId && (stored.get(ownId) ?? 0) < 1) throw new Error('Invalid aggregate');
  const sampleSize = total - (ownId ? 1 : 0), state = sampleSize === 0 ? 'empty' : sampleSize < minimumSampleSize ? 'insufficient' : 'ready';
  return DistributionSchema.parse({ state, sampleSize, minimumSampleSize, denominator,
    items: state !== 'ready' ? [] : choices.map(choice => {
      const count = (stored.get(choice.id) ?? 0) - (ownId === choice.id ? 1 : 0);
      return { ...choice, count, percentage: Math.round(count / sampleSize * 1000) / 10 };
    }) });
}

@Injectable()
export class FeedbackService {
  constructor(private readonly database: DatabaseService, private readonly owned: OwnedRuntimeService) {}
  async read(actor: ConsumerActor, attemptId: unknown, questionInput: unknown) {
    const questionId = parseInput(KeySchema, questionInput);
    return this.database.client.$transaction(async tx => {
      const { attempt } = await this.owned.attempt(tx, actor, attemptId, false);
      const version = await this.owned.version(tx, attempt.productVersionId, actor.scope);
      const question = version.configuration.questions.find(value => value.id === questionId);
      if (!question) throw new ApiException('NOT_FOUND', '当前版本没有此题目', 404);
      const answer = await tx.attemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId: attempt.id, questionId } } });
      if (!answer) throw new ApiException('FORBIDDEN', '确认回答后才能查看该题反馈', 403);
      try {
        await tx.$queryRaw(Prisma.sql`SELECT question_id FROM orai.question_stats WHERE product_version_id=${version.id}::uuid AND question_id=${questionId} FOR SHARE`);
        const resultLock = await tx.$queryRaw<{ product_version_id: string }[]>(Prisma.sql`SELECT product_version_id FROM orai.result_stats WHERE product_version_id=${version.id}::uuid FOR SHARE`);
        const answers = await tx.questionStat.findUnique({ where: { productVersionId_questionId: { productVersionId: version.id, questionId } }, include: { options: true } });
        const results = resultLock.length ? await tx.resultStat.findUnique({ where: { productVersionId: version.id }, include: { types: true } }) : null;
        const report = attempt.completedAt ? await tx.report.findUnique({ where: { attemptId: attempt.id }, select: { resultTypeId: true } }) : null;
        if (answers && answers.scope !== actor.scope || results && results.scope !== actor.scope) throw new Error('Invalid aggregate scope');
        const answerDistribution = distribution(question.options.map(value => ({ id: value.id, label: value.label })),
          new Map(answers?.options.map(value => [value.optionId, value.count]) ?? []), answers?.answerCount ?? 0, answer.optionId,
          version.configuration.statisticsMinimum, 'other_valid_answers');
        const resultDistribution = distribution([...version.configuration.resultTypes.map(value => ({ id: value.id, label: value.label })),
          { id: version.configuration.report.insufficient.id, label: version.configuration.report.insufficient.label }],
          new Map(results?.types.map(value => [value.resultTypeId, value.count]) ?? []), results?.completedCount ?? 0, report?.resultTypeId,
          version.configuration.statisticsMinimum, 'other_valid_completed_attempts');
        const updatedAt = new Date(Math.max(answers?.updatedAt.getTime() ?? attempt.createdAt.getTime(), results?.updatedAt.getTime() ?? 0));
        return FeedbackSchema.parse({ versionId: version.id, questionId, updatedAt: updatedAt.toISOString(), isDemo: actor.scope === 'DEMO', answers: answerDistribution, results: resultDistribution });
      } catch { throw new ApiException('SAMPLE_UNAVAILABLE', '群体反馈暂不可用，已保存的回答不受影响', 503); }
    }, { maxWait: 5000, timeout: 10000 });
  }
}
