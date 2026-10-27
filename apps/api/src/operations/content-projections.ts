import { createHash } from 'node:crypto';
import { AssetAuthoringSchema, ContentRevisionSchema, CreativeProfileRevisionSchema, ProductConfigurationSchema,
  type ContentLocator } from '@orai/contracts/admin';
import type { ContentRevision, CreativeProfileRevision, AssetFile, ProductionRecord } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';

export const contentDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const locatorKey = (value: ContentLocator) => value.kind === 'question' ? 'question:' + value.questionId :
  value.kind === 'block' ? 'block:' + value.blockId : value.kind === 'scene' ? 'scene:' + value.sceneId : 'whole';
export const profileDto = (row: CreativeProfileRevision) => CreativeProfileRevisionSchema.parse({
  id: row.id, productId: row.productId, scope: row.scope.toLowerCase(), revision: row.number,
  profile: row.profile, digest: row.digest, createdAt: row.createdAt.toISOString(), runtimeSupport: 'authoring_only',
});
export function productionDto(row: ProductionRecord) {
  const { skillSetId, skillVersions, machineCredentialId, machineRequestId, ...rest } = row;
  return {
    ...rest,
    scope: row.scope.toLowerCase(),
    createdAt: row.createdAt.toISOString(),
    ...(skillSetId ? { skillSetId, skillVersions } : {}),
    ...(machineCredentialId && machineRequestId ? { machineCredentialId, machineRequestId } : {}),
  };
}
export function snapshotAuthoring(snapshot: unknown) {
  const result = AssetAuthoringSchema.safeParse((snapshot as Record<string, unknown>)?.authoring);
  return result.success ? result.data : null;
}
export function revisionDto(row: ContentRevision & { file?: AssetFile | null; previewFile?: AssetFile | null }) {
  return ContentRevisionSchema.parse({
    id: row.id, productId: row.productId, productVersionId: row.productVersionId, assetId: row.assetId,
    scope: row.scope.toLowerCase(), domain: row.domain, sourceRevision: row.sourceRevision,
    creativeProfileRevisionId: row.creativeProfileRevisionId, snapshot: row.snapshot, digest: row.digest,
    createdAt: row.createdAt.toISOString(), storage: {
      localArchiveRegistered: !!snapshotAuthoring(row.snapshot)?.media.localArchive,
      previewUploaded: !!row.previewFileId && row.previewFile?.status === 'AVAILABLE',
      deliveryUploaded: !!row.fileId && row.file?.status === 'AVAILABLE',
    },
  });
}

// Contexts for promotional domains intentionally omit scores, thresholds,
// report templates and consumer records. Only explicitly selected fragments go out.
export function contentFragment(row: ContentRevision, locator: ContentLocator, domain: string): Record<string, unknown> {
  const snapshot = row.snapshot as Record<string, unknown>;
  if (row.domain === 'assessment') {
    const configuration = ProductConfigurationSchema.parse(snapshot.configuration);
    if (locator.kind === 'whole' && domain === 'assessment') return { configuration };
    if (locator.kind !== 'question') throw new ApiException('VALIDATION_ERROR', '宣传用途需明确选择题目节选', 400);
    const question = configuration.questions.find(item => item.id === locator.questionId);
    if (question) return { id: question.id, text: question.text, dimensionId: question.dimensionId, required: question.required,
      options: question.options.map(({ id, label, notApplicable }) => ({ id, label, notApplicable })) };
  } else {
    const authoring = snapshotAuthoring(snapshot), content = authoring?.content;
    if (locator.kind === 'whole') return { kind: snapshot.kind, platform: snapshot.platform,
      text: content?.kind === 'cover' ? content.title + '\n' + content.description : snapshot.text ?? '',
      fileId: row.fileId, previewFileId: row.previewFileId };
    if (locator.kind === 'block' && content?.kind === 'copy') {
      const block = content.blocks.find(item => item.blockId === locator.blockId); if (block) return block;
    }
    if (locator.kind === 'scene' && (content?.kind === 'video' || content?.kind === 'script')) {
      const scene = content.scenes.find(item => item.sceneId === locator.sceneId); if (scene) return scene;
    }
  }
  throw new ApiException('CONFLICT', '引用位置不存在于指定的内容修订', 409);
}
