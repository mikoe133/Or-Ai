import { Injectable } from '@nestjs/common';
import { IdSchema, KeySchema } from '@orai/contracts';
import { QuestionsResponseSchema, SavedAnswerSchema, SaveAnswerRequestSchema, SaveAnswerResponseSchema, StartAttemptRequestSchema, SubmitAttemptRequestSchema } from '@orai/contracts/private';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma, type Attempt, type AttemptAnswer } from '../generated/prisma/client';
import type { ConsumerActor } from './consumer-access.service';
import { OwnedRuntimeService } from './owned-runtime.service';
import { StatContributionsService } from './stat-contributions.service';
import { FeedbackService } from './feedback.service';
import { scoreAnswers } from './scoring';
import { reportResponse } from './reports.service';
import { runtimeRequest, previousRequest, rememberRequest } from './runtime-idempotency';
import { experienceCheckpoint } from './experience-checkpoint';

const savedAnswer = (answer: AttemptAnswer) => SavedAnswerSchema.parse({ questionId: answer.questionId, optionId: answer.optionId, revision: answer.revision, savedAt: answer.savedAt.toISOString() });
const conflict = () => new ApiException('REVISION_CONFLICT', '答卷已更新，请重新读取进度后重试', 409);

@Injectable()
export class AttemptsService {
  constructor(private readonly database: DatabaseService, private readonly owned: OwnedRuntimeService,
    private readonly contributions: StatContributionsService, private readonly feedback: FeedbackService) {}
  private async project(tx: Prisma.TransactionClient, attempt: Attempt, actor: ConsumerActor) {
    const version = await this.owned.version(tx, attempt.productVersionId, actor.scope);
    const answers = await tx.attemptAnswer.findMany({ where: { attemptId: attempt.id } });
    if (attempt.experienceReleaseId !== version.experience.id) throw new ApiException('INVALID_CONFIGURATION', '答卷体验版本不一致', 400);
    const order = new Map(version.configuration.questions.map((value, index) => [value.id, index]));
    if (answers.some(answer => !version.configuration.questions.some(question => question.id === answer.questionId && question.options.some(option => option.id === answer.optionId)))) {
      throw new ApiException('INVALID_CONFIGURATION', '回答与锁定版本不一致', 400);
    }
    return QuestionsResponseSchema.parse({ attemptId: attempt.id, versionId: version.id, versionNumber: version.number,
      revision: attempt.revision, status: attempt.status.toLowerCase(), isDemo: actor.scope === 'DEMO',
      experience: { release: version.experience, checkpoint: experienceCheckpoint(version.configuration.questions, answers, attempt.revision, attempt.runtimeCheckpoint, attempt.status === 'COMPLETED') },
      questions: version.configuration.questions.map(question => ({ id: question.id, text: question.text, dimensionId: question.dimensionId,
        required: question.required, options: question.options.map(option => ({ id: option.id, label: option.label, notApplicable: option.notApplicable })) })),
      answers: answers.sort((a,b) => order.get(a.questionId)! - order.get(b.questionId)!).map(savedAnswer) });
  }
  async start(actor: ConsumerActor, input: unknown) {
    const request = parseInput(StartAttemptRequestSchema, input), entitlementId = request.entitlementId.toLowerCase();
    return this.database.client.$transaction(async tx => {
      const entitlement = await this.owned.entitlement(tx, actor, entitlementId, true);
      const key = runtimeRequest(actor.scope, entitlementId, 'start', request.requestId, {}), previous = await previousRequest(tx, key);
      let attempt = await tx.attempt.findUnique({ where: { entitlementId_ordinal: { entitlementId, ordinal: 1 } } });
      if (!attempt) {
        if (entitlement.reportsConsumed >= entitlement.reportsAllowed) throw new ApiException('CONFLICT', '该权益没有剩余报告次数', 409);
        await this.owned.version(tx, entitlement.productVersionId, actor.scope);
        attempt = await tx.attempt.create({ data: { entitlementId, productVersionId: entitlement.productVersionId, scope: actor.scope, ordinal: 1 } });
        await tx.event.create({ data: { dedupeKey: 'start:' + attempt.id, scope: actor.scope, productVersionId: attempt.productVersionId,
          kind: 'START', source: actor.scope === 'DEMO' ? 'DEMO' : 'WEB' } });
      }
      if (!attempt.statsValid || attempt.status === 'INVALID') throw new ApiException('FORBIDDEN', '答卷已失效，请查看权益状态', 403);
      if (!previous) await rememberRequest(tx, key, { attemptId: attempt.id });
      return this.project(tx, attempt, actor);
    }, { maxWait: 5000, timeout: 10000 });
  }
  questions(actor: ConsumerActor, input: unknown) {
    return this.database.client.$transaction(async tx => {
      const { attempt } = await this.owned.attempt(tx, actor, input, false);
      return this.project(tx, attempt, actor);
    });
  }
  async save(actor: ConsumerActor, attemptInput: unknown, questionInput: unknown, input: unknown) {
    const id = parseInput(IdSchema, attemptInput).toLowerCase(), questionId = parseInput(KeySchema, questionInput), request = parseInput(SaveAnswerRequestSchema, input);
    const saved = await this.database.client.$transaction(async tx => {
      const { attempt } = await this.owned.attempt(tx, actor, id, true);
      if (attempt.status === 'COMPLETED') throw new ApiException('ATTEMPT_COMPLETED', '报告已完成，回答不能再修改', 409);
      const version = await this.owned.version(tx, attempt.productVersionId, actor.scope), question = version.configuration.questions.find(value => value.id === questionId);
      if (!question) throw new ApiException('NOT_FOUND', '当前版本没有此题目', 404);
      if (!question.options.some(option => option.id === request.optionId)) throw new ApiException('VALIDATION_ERROR', '请选择当前题目的有效选项', 400);
      const key = runtimeRequest(actor.scope, attempt.entitlementId, 'save:' + id + ':' + questionId, request.requestId,
        { optionId: request.optionId, expectedRevision: request.expectedRevision });
      const previous = await previousRequest(tx, key);
      const answer = await tx.attemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId: id, questionId } } });
      if (previous) {
        const reference = previous.response as { attemptRevision?: number };
        if (reference.attemptRevision !== attempt.revision || !answer || answer.optionId !== request.optionId) throw conflict();
        return { answer: savedAnswer(answer), attemptRevision: attempt.revision,
          checkpoint: experienceCheckpoint(version.configuration.questions, await tx.attemptAnswer.findMany({ where: { attemptId: id } }), attempt.revision, attempt.runtimeCheckpoint) };
      }
      if (request.expectedRevision !== attempt.revision) throw conflict();
      const now = new Date();
      await this.contributions.answer(tx, version.id, actor.scope, question, request.optionId, answer?.optionId, now);
      const changed = await tx.attemptAnswer.upsert({ where: { attemptId_questionId: { attemptId: id, questionId } },
        create: { attemptId: id, questionId, optionId: request.optionId, revision: 1, savedAt: now },
        update: { optionId: request.optionId, revision: { increment: 1 }, savedAt: now } });
      const checkpoint = { schemaVersion: 1, revision: attempt.revision + 1, lastConfirmedQuestionId: questionId };
      const updated = await tx.attempt.update({ where: { id }, data: { revision: { increment: 1 }, status: 'STARTED', runtimeCheckpoint: checkpoint } });
      await rememberRequest(tx, key, { questionId, attemptRevision: updated.revision });
      return { answer: savedAnswer(changed), attemptRevision: updated.revision,
        checkpoint: experienceCheckpoint(version.configuration.questions, await tx.attemptAnswer.findMany({ where: { attemptId: id } }), updated.revision, checkpoint) };
    }, { maxWait: 5000, timeout: 10000 });
    try { return SaveAnswerResponseSchema.parse({ ...saved, feedback: await this.feedback.read(actor, id, questionId), feedbackStatus: 'ready' }); }
    catch (error) {
      if (!(error instanceof ApiException) || error.code !== 'SAMPLE_UNAVAILABLE') throw error;
      return SaveAnswerResponseSchema.parse({ ...saved, feedback: null, feedbackStatus: 'unavailable' });
    }
  }
  async submit(actor: ConsumerActor, input: unknown, body: unknown) {
    const id = parseInput(IdSchema, input).toLowerCase(), request = parseInput(SubmitAttemptRequestSchema, body);
    return this.database.client.$transaction(async tx => {
      const { attempt, entitlement } = await this.owned.attempt(tx, actor, id, true);
      const key = runtimeRequest(actor.scope, entitlement.id, 'submit:' + id, request.requestId, { expectedRevision: request.expectedRevision });
      const previous = await previousRequest(tx, key);
      if (attempt.status === 'COMPLETED') {
        const report = await tx.report.findUniqueOrThrow({ where: { attemptId: id } });
        const response = reportResponse(report);
        if (!previous) await rememberRequest(tx, key, { reportId: report.id });
        return response;
      }
      if (previous || request.expectedRevision !== attempt.revision) throw conflict();
      if (entitlement.reportsConsumed >= entitlement.reportsAllowed) throw new ApiException('CONFLICT', '该权益没有剩余报告次数', 409);
      const version = await this.owned.version(tx, attempt.productVersionId, actor.scope);
      const answers = await tx.attemptAnswer.findMany({ where: { attemptId: id } });
      const content = scoreAnswers(version.configuration, answers, { productName: version.productName, versionNumber: version.number, isDemo: actor.scope === 'DEMO' });
      const now = new Date();
      const report = await tx.report.create({ data: { attemptId: id, productVersionId: version.id, scope: actor.scope,
        resultTypeId: content.resultTypeId, snapshot: content as Prisma.InputJsonValue, createdAt: now,
        expiresAt: new Date(now.getTime() + version.configuration.retention.reportDays * 86_400_000) } });
      await this.contributions.result(tx, version.id, actor.scope, version.configuration, content.resultTypeId, now);
      await tx.attempt.update({ where: { id }, data: { status: 'COMPLETED', submittedAt: attempt.submittedAt ?? now, completedAt: now,
        answersExpireAt: new Date(now.getTime() + version.configuration.retention.rawAnswerDays * 86_400_000) } });
      await tx.entitlement.update({ where: { id: entitlement.id }, data: { reportsConsumed: { increment: 1 } } });
      await tx.event.create({ data: { dedupeKey: 'complete:' + id, scope: actor.scope, productVersionId: version.id, kind: 'COMPLETE', source: actor.scope === 'DEMO' ? 'DEMO' : 'WEB' } });
      await rememberRequest(tx, key, { reportId: report.id });
      return reportResponse(report);
    }, { maxWait: 5000, timeout: 15000 });
  }
}
