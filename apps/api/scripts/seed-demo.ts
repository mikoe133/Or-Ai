import { createHash, randomBytes } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { ProductConfigurationSchema, type ProductConfiguration } from '@orai/contracts/admin';
import { ReportContentSchema } from '@orai/contracts';
import { Prisma, type AttemptStatus, type EntitlementStatus } from '../src/generated/prisma/client';
import { assertDemoDatabase } from './local-database';
import { demoId, DemoCategories, DemoIdentityScenarios, DemoProducts, demoPublicSample, DemoTags } from './demo-fixtures';

const days = (date: Date, amount: number) => new Date(date.getTime() + amount * 86_400_000);
function secret() {
  const value = randomBytes(32).toString('base64url');
  return { value, digest: createHash('sha256').update(value).digest('hex') };
}

interface Scenario {
  key: string; product: string; completed?: boolean; partial?: boolean; allAnswers?: boolean;
  status?: AttemptStatus; entitlementStatus?: EntitlementStatus; bound?: boolean;
  historical?: boolean; deleted?: boolean; invalid?: boolean; notApplicable?: boolean; revision?: number; choice?: string;
}

const scenarios: Scenario[] = [
  ...Array.from({ length: 21 }, (_, index) => ({ key: 'population-' + index, product: 'demo-partner', completed: true,
    choice: ['rarely', 'sometimes', 'often'][index % 3]! })),
  { key: 'partial', product: 'demo-partner', partial: true },
  { key: 'pending', product: 'demo-partner' },
  { key: 'reissued', product: 'demo-work', partial: true },
  { key: 'all-answered', product: 'demo-work', allAnswers: true },
  { key: 'submitted', product: 'demo-work', allAnswers: true, status: 'SUBMITTED' },
  { key: 'revision-conflict', product: 'demo-work', partial: true, revision: 2 },
  { key: 'bound', product: 'demo-work', completed: true, bound: true },
  { key: 'report-expired', product: 'demo-work', completed: true, historical: true },
  { key: 'entitlement-expired', product: 'demo-work', completed: true, historical: true, entitlementStatus: 'EXPIRED' },
  { key: 'refunded', product: 'demo-work', completed: true, entitlementStatus: 'REVOKED', invalid: true },
  { key: 'invalid', product: 'demo-work', partial: true, status: 'INVALID', invalid: true },
  { key: 'not-applicable', product: 'demo-social', completed: true, notApplicable: true },
  { key: 'deleted-report', product: 'demo-social', completed: true, deleted: true, invalid: true },
];

function reportSnapshot(productName: string, config: ProductConfiguration, choice: string, notApplicable: boolean) {
  // Deliberately synthetic fixture snapshots. The general runtime scorer is T05.
  const score = notApplicable ? null : choice === 'rarely' ? 0 : choice === 'sometimes' ? 50 : 100;
  const result = score === null ? config.report.insufficient : config.resultTypes.find(value =>
    config.bands.some(band => band.resultTypeId === value.id && score >= band.min && (score < band.max || band.max === 100 && score === 100)))!;
  const template = score === null ? config.report.insufficient : config.report.templates.find(value => value.resultTypeId === result.id)!;
  return ReportContentSchema.parse({ schemaVersion: 1, productName, versionNumber: 1, resultTypeId: result.id,
    resultLabel: result.label, totalScore: score,
    dimensions: config.dimensions.map(dimension => ({ id: dimension.id, label: dimension.label, score,
      applicableAnswers: notApplicable ? 0 : config.questions.filter(question => question.dimensionId === dimension.id).length,
      requiredAnswers: dimension.minApplicableAnswers, missingReason: notApplicable ? dimension.missingReason : null })),
    explanation: template.explanation, suggestion: template.suggestion, disclaimer: config.report.disclaimer, isDemo: true });
}

export async function seedDemo(env: NodeJS.ProcessEnv) {
  const { connection, marker } = await assertDemoDatabase(env);
  const codes: Record<string, string> = {};
  const sessions: Record<string, string> = {};
  try {
    await connection.client.$transaction(async tx => {
      const anchor = marker.createdAt;
      for (const [index, [slug, name]] of DemoCategories.entries()) await tx.category.upsert({
        where: { slug }, create: { id: demoId('category-' + slug), slug, name, sortOrder: index }, update: {},
      });
      for (const [slug, name] of DemoTags) await tx.tag.upsert({
        where: { slug }, create: { id: demoId('tag-' + slug), slug, name }, update: {},
      });
      for (const [key, identity] of Object.entries(DemoIdentityScenarios)) await tx.user.upsert({
        where: { id: identity.id }, create: { id: identity.id, supabaseUserId: identity.supabaseUserId, role: identity.role, scope: 'DEMO' }, update: {},
      });

      const products = [
        ...DemoProducts,
        { ...DemoProducts[1]!, slug: 'fixture-draft', name: '草稿商品 · 测试状态', configurations: [DemoProducts[1]!.configurations[0]!] },
        { ...DemoProducts[1]!, slug: 'fixture-archived', name: '已下架商品 · 测试状态', configurations: [DemoProducts[1]!.configurations[0]!] },
      ];
      for (const product of products) {
        const draft = product.slug === 'fixture-draft';
        const row = await tx.product.upsert({ where: { slug: product.slug }, update: {}, create: {
          id: demoId(product.slug), slug: product.slug, name: product.name, hook: product.hook, summary: product.summary,
          description: product.summary + ' 演示内容，不用于购买。', categoryId: demoId('category-' + product.category),
          scope: 'DEMO', status: 'DRAFT', priceFen: 990, currency: 'CNY', durationMinutes: product.duration,
          experienceType: product.type, themeKey: product.slug, coverUrl: product.coverUrl,
          publicSample: demoPublicSample(product.configurations[0]!), purchaseUrl: null,
          purchaseNotice: '演示内容，不用于购买；¥9.90 仅为联调价格。', redemptionNotice: '测试码用于本地演示，正式交付规则以后确定。',
          recommended: product.slug === 'demo-partner', recommendationOrder: 1,
        } });
        if (row.scope !== 'DEMO') throw new Error('Demo seed collides with a live product');
        for (const [index, raw] of product.configurations.entries()) {
          const configuration = ProductConfigurationSchema.parse(raw);
          const existing = await tx.productVersion.findUnique({ where: { productId_number: { productId: row.id, number: index + 1 } } });
          if (existing && !isDeepStrictEqual(ProductConfigurationSchema.parse(existing.configuration), configuration)) {
            throw new Error('Demo configuration changed; create a new version instead of overwriting a published snapshot');
          }
          await tx.productVersion.upsert({ where: { id: demoId(product.slug + '-v' + (index + 1)) }, update: {}, create: {
            id: demoId(product.slug + '-v' + (index + 1)), productId: row.id, scope: 'DEMO', number: index + 1,
            status: draft ? 'DRAFT' : 'PUBLISHED', configuration: configuration as Prisma.InputJsonValue,
            publishedAt: draft ? null : anchor,
          } });
        }
        if (!draft && !row.currentVersionId) await tx.product.update({ where: { id: row.id }, data: {
          currentVersionId: demoId(product.slug + '-v' + product.configurations.length),
          status: product.slug === 'fixture-archived' ? 'ARCHIVED' : 'PUBLISHED', publishedAt: anchor,
        } });
        for (const tag of [product.tag, 'demo']) await tx.productTag.upsert({
          where: { productId_tagId: { productId: row.id, tagId: demoId('tag-' + tag) } },
          create: { productId: row.id, tagId: demoId('tag-' + tag) }, update: {},
        });
      }

      async function order(key: string, versionId: string, refunded = false) {
        return tx.order.upsert({ where: { id: demoId('order-' + key) }, update: {}, create: {
          id: demoId('order-' + key), platform: 'MANUAL', reference: 'demo:' + key,
          productVersionId: versionId, scope: 'DEMO', quantity: 1, amountFen: 990,
          status: refunded ? 'REFUNDED' : 'FULFILLED', refundedAt: refunded ? anchor : null,
        } });
      }
      async function code(key: string, versionId: string, orderId: string, entitlementId: string | null,
        status: 'ISSUED' | 'CLAIMED' | 'EXPIRED' | 'REVOKED', replacesCodeId: string | null = null) {
        const id = demoId('code-' + key);
        if (await tx.redemptionCode.findUnique({ where: { id } })) return;
        const generated = secret(); codes[key] = generated.value;
        await tx.redemptionCode.create({ data: {
          id, digest: generated.digest, productVersionId: versionId, orderId, entitlementId, scope: 'DEMO', status,
          claimDeadline: days(anchor, status === 'EXPIRED' ? -1 : 30), claimedAt: entitlementId ? anchor : null,
          revokedAt: status === 'REVOKED' ? anchor : null, replacesCodeId,
        } });
      }
      async function session(key: string, entitlementIds: string[], expired = false, revoked = false) {
        const id = demoId('session-' + key);
        if (!await tx.accessSession.findUnique({ where: { id } })) {
          const generated = secret(); sessions[key] = generated.value;
          await tx.accessSession.create({ data: { id, tokenDigest: generated.digest, scope: 'DEMO',
            createdAt: days(anchor, expired ? -10 : 0), expiresAt: days(anchor, expired ? -1 : 30),
            revokedAt: revoked ? anchor : null } });
        }
        for (const entitlementId of entitlementIds) await tx.accessGrant.upsert({
          where: { sessionId_entitlementId: { sessionId: id, entitlementId } },
          create: { sessionId: id, entitlementId, scope: 'DEMO', revokedAt: revoked ? anchor : null }, update: {},
        });
      }

      for (const scenario of scenarios) {
        const product = DemoProducts.find(value => value.slug === scenario.product)!;
        const config = product.configurations[0]!;
        const versionId = demoId(product.slug + '-v1'), entitlementId = demoId('entitlement-' + scenario.key);
        const claimedAt = days(anchor, scenario.historical ? (scenario.entitlementStatus === 'EXPIRED' ? -130 : -100) : 0);
        const testOrder = await order(scenario.key, versionId, scenario.entitlementStatus === 'REVOKED');
        await tx.entitlement.upsert({ where: { id: entitlementId }, update: {}, create: {
          id: entitlementId, productVersionId: versionId, orderId: testOrder.id, scope: 'DEMO',
          ownership: scenario.bound ? 'ACCOUNT_BOUND' : 'ANONYMOUS', ownerUserId: scenario.bound ? DemoIdentityScenarios.verified.id : null,
          boundAt: scenario.bound ? anchor : null, status: scenario.entitlementStatus ?? 'ACTIVE',
          reportsAllowed: 1, reportsConsumed: scenario.completed ? 1 : 0, claimedAt, accessExpiresAt: days(claimedAt, config.retention.entitlementDays),
          revokedAt: scenario.entitlementStatus === 'REVOKED' ? anchor : null,
        } });
        if (scenario.bound) await tx.entitlementBinding.upsert({ where: { entitlementId }, update: {},
          create: { entitlementId, userId: DemoIdentityScenarios.verified.id } });
        await code(scenario.key, versionId, testOrder.id, entitlementId, scenario.entitlementStatus === 'REVOKED' ? 'REVOKED' : 'CLAIMED');
        await session(scenario.key, [entitlementId], false, scenario.bound || scenario.entitlementStatus === 'REVOKED');
        if (!scenario.completed && !scenario.partial && !scenario.allAnswers) continue;
        const attemptId = demoId('attempt-' + scenario.key), choice = scenario.notApplicable ? 'na' : scenario.choice ?? 'often';
        const questions = scenario.partial ? config.questions.slice(0, 1) : config.questions;
        await tx.attempt.upsert({ where: { id: attemptId }, update: {}, create: {
          id: attemptId, entitlementId, productVersionId: versionId, scope: 'DEMO', ordinal: 1,
          status: scenario.status ?? (scenario.completed ? 'COMPLETED' : 'STARTED'),
          revision: questions.length + (scenario.revision === 2 ? 1 : 0), statsValid: !scenario.invalid,
          completedAt: scenario.completed ? claimedAt : null,
          submittedAt: scenario.completed || scenario.status === 'SUBMITTED' ? claimedAt : null,
          invalidatedAt: scenario.invalid ? anchor : null,
          answersExpireAt: scenario.completed ? days(claimedAt, config.retention.rawAnswerDays) : null,
        } });
        for (const question of questions) await tx.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: question.id } }, update: {},
          create: { attemptId, questionId: question.id, optionId: choice, revision: scenario.revision ?? 1, savedAt: claimedAt },
        });
        if (scenario.completed) {
          const snapshot = reportSnapshot(product.name, config, choice, Boolean(scenario.notApplicable));
          await tx.report.upsert({ where: { attemptId }, update: {}, create: {
            id: demoId('report-' + scenario.key), attemptId, productVersionId: versionId, scope: 'DEMO',
            resultTypeId: snapshot.resultTypeId, snapshot: scenario.deleted ? Prisma.DbNull : snapshot as Prisma.InputJsonValue,
            createdAt: claimedAt, expiresAt: days(claimedAt, config.retention.reportDays), deletedAt: scenario.deleted ? anchor : null,
          } });
        }
        for (const [kind, suffix] of [['START', 'start'], ...(scenario.completed ? [['COMPLETE', 'complete']] : [])] as [ 'START' | 'COMPLETE', string ][]) {
          await tx.event.upsert({ where: { dedupeKey: 'demo:' + scenario.key + ':' + suffix }, update: {},
            create: { id: demoId('event-' + scenario.key + '-' + suffix), dedupeKey: 'demo:' + scenario.key + ':' + suffix,
              scope: 'DEMO', kind, source: 'DEMO', productVersionId: versionId, occurredAt: claimedAt } });
        }
      }
      await session('multiple-products', [demoId('entitlement-pending'), demoId('entitlement-all-answered')]);
      await session('expired', [demoId('entitlement-pending')], true);
      for (const status of ['ISSUED', 'EXPIRED', 'REVOKED'] as const) {
        const testOrder = await order('unclaimed-' + status, demoId('demo-partner-v2'));
        await code('unclaimed-' + status, demoId('demo-partner-v2'), testOrder.id, null, status);
      }
      const reissueOrder = await tx.order.findUniqueOrThrow({ where: { id: demoId('order-reissued') } });
      if (!await tx.redemptionCode.findUnique({ where: { id: demoId('code-replacement-new') } })) {
        await tx.redemptionCode.update({ where: { id: demoId('code-reissued') }, data: { status: 'REVOKED', revokedAt: anchor } });
        await tx.accessGrant.updateMany({ where: { entitlementId: demoId('entitlement-reissued') }, data: { revokedAt: anchor } });
        await code('replacement-new', reissueOrder.productVersionId, reissueOrder.id, demoId('entitlement-reissued'), 'CLAIMED', demoId('code-reissued'));
        await session('replacement-new', [demoId('entitlement-reissued')]);
      }
      await tx.codeBatch.upsert({ where: { id: demoId('batch') }, update: {},
        create: { id: demoId('batch'), orderId: demoId('order-unclaimed-ISSUED'), scope: 'DEMO' } });
      await tx.redemptionCode.update({ where: { id: demoId('code-unclaimed-ISSUED') }, data: { batchId: demoId('batch') } });

      for (const product of DemoProducts) for (const [index, config] of product.configurations.entries()) {
        const versionId = demoId(product.slug + '-v' + (index + 1));
        const attempts = await tx.attempt.findMany({ where: { productVersionId: versionId, statsValid: true, scope: 'DEMO' }, include: { answers: true, report: true } });
        for (const question of config.questions) {
          const answers = attempts.flatMap(attempt => attempt.answers.filter(answer => answer.questionId === question.id));
          await tx.questionStat.upsert({ where: { productVersionId_questionId: { productVersionId: versionId, questionId: question.id } },
            create: { productVersionId: versionId, questionId: question.id, scope: 'DEMO', answerCount: answers.length },
            update: { answerCount: answers.length, updatedAt: anchor } });
          for (const option of question.options) {
            const count = answers.filter(answer => answer.optionId === option.id).length;
            await tx.questionOptionStat.upsert({ where: { productVersionId_questionId_optionId: { productVersionId: versionId, questionId: question.id, optionId: option.id } },
              create: { productVersionId: versionId, questionId: question.id, optionId: option.id, count }, update: { count } });
          }
        }
        const completed = attempts.filter(attempt => attempt.status === 'COMPLETED' && attempt.report);
        await tx.resultStat.upsert({ where: { productVersionId: versionId },
          create: { productVersionId: versionId, scope: 'DEMO', completedCount: completed.length },
          update: { completedCount: completed.length, updatedAt: anchor } });
        for (const resultTypeId of [...config.resultTypes.map(value => value.id), config.report.insufficient.id]) {
          const count = completed.filter(attempt => attempt.report?.resultTypeId === resultTypeId).length;
          await tx.resultTypeStat.upsert({ where: { productVersionId_resultTypeId: { productVersionId: versionId, resultTypeId } },
            create: { productVersionId: versionId, resultTypeId, count }, update: { count } });
        }
        for (const platform of ['DOUYIN', 'XIAOHONGSHU'] as const) for (const kind of ['COVER', 'VIDEO', 'SCRIPT', 'COPY'] as const) {
          await tx.campaignAsset.upsert({ where: { productVersionId_platform_kind_variant: { productVersionId: versionId, platform, kind, variant: 'A' } }, update: {}, create: {
            id: demoId('asset-' + product.slug + '-' + index + '-' + platform + '-' + kind), productVersionId: versionId, scope: 'DEMO',
            platform, kind, variant: 'A', status: kind === 'VIDEO' ? 'DRAFT' : 'REVIEWED',
            text: ['SCRIPT', 'COPY'].includes(kind) ? '演示素材，正式脚本和文案尚未制作。' : null,
            storageKey: kind === 'COVER' ? 'demo/partner.svg' : null,
          } });
        }
      }
      await tx.campaign.upsert({ where: { code: 'demo-local-preview' }, update: {}, create: {
        id: demoId('campaign'), code: 'demo-local-preview', productVersionId: demoId('demo-partner-v2'),
        scope: 'DEMO', platform: 'MANUAL', title: '本地演示预览', purchaseUrl: null, contentUrl: null,
      } });
      await tx.adminAuditLog.upsert({ where: { id: demoId('audit-seed') }, update: {}, create: {
        id: demoId('audit-seed'), actorUserId: DemoIdentityScenarios.admin.id, scope: 'DEMO',
        action: 'demo_seed', entityKind: 'product', entityId: demoId('demo-partner'),
      } });
    }, { timeout: 30_000 });
    return { codes, sessions, scope: 'DEMO' as const };
  } finally { await connection.close(); }
}
