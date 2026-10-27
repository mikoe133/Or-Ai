import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { MachinePermissionSchema, MachineUploadTargetSchema } from '@orai/contracts/admin';
import type { Prisma, MachineCredential } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';

type InputReference = { revisionId: string; digest: string; locator: { kind: string } };
type ContentTarget = {
  type: 'content'; productId?: string; productVersionId?: string; revisionId?: string;
  profileId?: string; skillSetId?: string; inputs?: InputReference[];
  assetId?: string; fileIds?: string[];
};
type SkillTarget = {
  type: 'skill'; skillId?: string; versionId?: string; fileIds?: string[];
};
type ExperienceTarget = { type: 'experience'; productVersionId?: string; revisionId?: string; profileId?: string; methodVersionIds?: string[]; fileIds?: string[] };
export type ProjectTarget = { type: 'project'; bootstrap?: boolean; list?: boolean; productId?: string; planRevisionId?: string;
  planModuleId?: string; snapshotId?: string; recordId?: string; sourceVersionId?: string; runId?: string; attemptId?: string };
export type MachineRequirement = {
  permission: z.infer<typeof MachinePermissionSchema>;
  extraPermissions?: z.infer<typeof MachinePermissionSchema>[];
  target: z.infer<typeof MachineUploadTargetSchema> | ContentTarget | SkillTarget | ExperienceTarget | ProjectTarget;
  uploadId?: string;
  ticketDigest?: string;
};
export const machineDigest = (secret: string) => createHash('sha256').update(secret).digest('hex');
export const machineDenied = () => new ApiException('FORBIDDEN', '机器凭据未获此领域、权限或目标的授权', 403);
export const machineInvalid = () => new ApiException('AUTH_REQUIRED', '机器凭据已失效或不可用', 401);

export async function machineWorkspace(row: MachineCredential, source: Prisma.TransactionClient) {
  const workspace = row.workspaceId ? await source.machineProjectWorkspace.findFirst({ where: {
    id: row.workspaceId, scope: row.scope, ownerUserId: row.ownerUserId, revokedAt: null, expiresAt: { gt: new Date() },
  } }) : null;
  if (!workspace) throw machineDenied();
  return workspace;
}
export async function allowedMachineProducts(row: MachineCredential, source: Prisma.TransactionClient) {
  const projects = row.workspaceId ? (await source.machineProject.findMany({ where: { workspaceId: row.workspaceId, scope: row.scope },
    select: { productId: true } })).map(p => p.productId) : [];
  return [...new Set([...row.productIds, ...projects])];
}
export async function allowedMachineSkills(row: MachineCredential, source: Prisma.TransactionClient) {
  const skills = row.workspaceId ? (await source.machineProjectSkill.findMany({ where: { domain: row.domain, scope: row.scope,
    project: { workspaceId: row.workspaceId } }, select: { skillId: true } })).map(p => p.skillId) : [];
  return [...new Set([...row.skillIds, ...skills])];
}
export async function projectBinding(row: MachineCredential, target: ProjectTarget, source: Prisma.TransactionClient) {
  await machineWorkspace(row, source);
  let productId = target.productId, planRevisionId = target.planRevisionId, planModuleId = target.planModuleId, runId = target.runId;
  const bind = (actual: string | undefined, expected: string) => { if (actual && actual !== expected) throw machineDenied(); return expected; };
  if (target.attemptId) {
    const attempt = await source.externalProductionAttempt.findFirst({ where: { id: target.attemptId, scope: row.scope, domain: row.domain } });
    if (!attempt) throw machineDenied(); runId = bind(runId,attempt.runId); planModuleId = bind(planModuleId,attempt.planModuleId);
  }
  if (runId) {
    const run = await source.externalProductionRun.findFirst({ where: { id: runId, scope: row.scope, workspaceId: row.workspaceId! } });
    if (!run) throw machineDenied(); productId = bind(productId,run.productId); planRevisionId = bind(planRevisionId,run.planRevisionId);
  }
  if (target.snapshotId) {
    const method = await source.projectMethodSnapshot.findFirst({ where: { id: target.snapshotId, scope: row.scope } });
    if (!method) throw machineDenied(); planModuleId = bind(planModuleId, method.planModuleId);
  }
  if (target.recordId) {
    const record = await source.projectProductionRecord.findFirst({ where: { id: target.recordId, scope: row.scope } });
    if (!record) throw machineDenied(); planModuleId = bind(planModuleId, record.planModuleId);
  }
  if (planModuleId) {
    const module = await source.productionPlanModule.findFirst({ where: { id: planModuleId, scope: row.scope } });
    if (!module || module.definition === null || (module.definition as { domain: string }).domain !== row.domain) throw machineDenied();
    productId = bind(productId, module.productId); planRevisionId = bind(planRevisionId, module.planRevisionId);
  }
  if (planRevisionId) {
    const plan = await source.productionPlanRevision.findFirst({ where: { id: planRevisionId, scope: row.scope } });
    if (!plan) throw machineDenied(); productId = bind(productId, plan.productId);
  }
  if (target.sourceVersionId) {
    const version = await source.styleSkillVersion.findFirst({ where: { id: target.sourceVersionId, scope: row.scope } });
    if (!version || !row.permissions.includes('skills:read')) throw machineDenied();
    await requireSkill(row, version.skillId, source);
  }
  if (productId && !await source.machineProject.findFirst({ where: { productId, workspaceId: row.workspaceId!, scope: row.scope } })) throw machineDenied();
  if (!productId && !target.bootstrap && !target.list) throw machineDenied();
  if ((target.bootstrap || target.list) && (productId || planModuleId || target.sourceVersionId)) throw machineDenied();
  return { productId, planRevisionId, planModuleId, runId, attemptId: target.attemptId };
}

export async function requireMachineTarget(row: MachineCredential, requirement: MachineRequirement, source: Prisma.TransactionClient) {
  if (![requirement.permission, ...requirement.extraPermissions ?? []].every(p => row.permissions.includes(p))) throw machineDenied();
  const target = requirement.target;
  if (target.type === 'project') {
    if ((requirement.permission === 'projects:create' || requirement.permission === 'projects:write') && row.domain !== 'assessment') throw machineDenied();
    if (target.bootstrap !== (requirement.permission === 'projects:create' ? true : undefined)) throw machineDenied();
    await projectBinding(row, target, source);
  } else if (target.type === 'project_original') {
    const binding = await projectBinding(row, { type: 'project', planModuleId: target.planModuleId }, source);
    const module = await source.productionPlanModule.findUniqueOrThrow({ where: { id: target.planModuleId } });
    const slot = (module.definition as { outputs: { outputKey: string; kind: string; files: { fileKey: string; purpose: string }[] }[] })
      .outputs.find(output => output.outputKey === target.outputKey);
    if (!binding.productId || !slot || !['web_bundle','scene_bundle'].includes(slot.kind) ||
      !slot.files.some(file => file.fileKey === target.fileKey && file.purpose === 'original')) throw machineDenied();
  } else if (target.type === 'content') {
    await requireContent(row, target, source);
  } else if (target.type === 'experience') {
    await requireExperience(row, target, source);
  } else if (target.type === 'skill') {
    if (target.skillId) {
      await requireSkill(row, target.skillId, source);
      if (target.versionId && !await source.styleSkillVersion.findFirst({ where: {
        id: target.versionId, skillId: target.skillId, scope: row.scope,
      } })) throw machineDenied();
      for (const fileId of target.fileIds ?? []) {
        const file = await source.skillReferenceFile.findFirst({ where: { id: fileId, skillId: target.skillId, scope: row.scope, status: 'AVAILABLE' } });
        const owned = await source.machineUpload.findFirst({ where: { id: fileId, credentialId: row.id, skillFileId: fileId } });
        const attached = await source.styleSkillAttachment.findFirst({ where: { fileId, skillId: target.skillId, scope: row.scope } });
        if (!file || (!owned && !attached)) throw machineDenied();
      }
    } else if (target.versionId || target.fileIds?.length) throw machineDenied();
  } else if (target.type === 'media' || target.type === 'experience_resource') {
    if (row.domain !== (target.type === 'media' ? target.kind : 'experience')) throw machineDenied();
    const version = await source.productVersion.findFirst({ where: { id: target.productVersionId, scope: row.scope } });
    if (!version || !(await allowedMachineProducts(row, source)).includes(version.productId)) throw machineDenied();
  } else {
    await requireSkill(row, target.skillId, source);
  }
  if (requirement.uploadId) {
    const upload = await source.machineUpload.findFirst({ where: { id: requirement.uploadId, credentialId: row.id, scope: row.scope } });
    if (!upload) throw new ApiException('NOT_FOUND', '上传不属于当前机器连接', 404);
    if (requirement.ticketDigest) {
      if (upload.ticketDigest !== requirement.ticketDigest) throw machineDenied();
      if (upload.expiresAt <= new Date()) throw new ApiException('ENTITLEMENT_EXPIRED', '上传票据已过期，请重新申请', 410);
    }
  }
}

async function requireExperience(row: MachineCredential, target: ExperienceTarget, source: Prisma.TransactionClient) {
  if (row.domain !== 'experience') throw machineDenied();
  const revision = target.revisionId ? await source.experienceAuthoringRevision.findFirst({ where: { id: target.revisionId, scope: row.scope } }) : null;
  if (target.revisionId && !revision) throw machineDenied();
  const versionId = target.productVersionId ?? revision?.productVersionId;
  if (!versionId || (revision && revision.productVersionId !== versionId)) throw machineDenied();
  const version = await source.productVersion.findFirst({ where: { id: versionId, scope: row.scope } });
  if (!version || !(await allowedMachineProducts(row, source)).includes(version.productId)) throw machineDenied();
  if (target.profileId) {
    const profile = await source.creativeProfileRevision.findFirst({ where: { id: target.profileId, productId: version.productId, scope: row.scope } });
    if (!profile || (version.creativeProfileRevisionId && version.creativeProfileRevisionId !== profile.id)) throw machineDenied();
  }
  const methods = revision?.methods as { version: { id: string } }[] | undefined;
  const ids = [...target.methodVersionIds ?? [], ...(methods ?? []).map(m => m.version.id)];
  if (ids.length && !row.permissions.includes('skills:read')) throw machineDenied();
  for (const id of ids) {
    const method = await source.styleSkillVersion.findFirst({ where: { id, scope: row.scope, skill: { domain: 'experience' } } });
    if (!method) throw machineDenied();
    await requireSkill(row, method.skillId, source);
  }
  for (const fileId of target.fileIds ?? []) {
    const file = await source.assetFile.findFirst({ where: { id: fileId, productVersionId: versionId, scope: row.scope, kind: 'EXPERIENCE', status: 'AVAILABLE' } });
    const own = await source.machineUpload.findFirst({ where: { credentialId: row.id, assetFileId: fileId } });
    const fixed = await source.experienceAuthoringResource.findFirst({ where: { fileId, productVersionId: versionId, scope: row.scope } });
    if (!file || (!own && !fixed)) throw machineDenied();
  }
}

async function requireSkill(row: MachineCredential, skillId: string, source: Prisma.TransactionClient) {
  if (!(await allowedMachineSkills(row, source)).includes(skillId) || !await source.styleSkill.findFirst({ where: { id: skillId, domain: row.domain, scope: row.scope } }))
    throw machineDenied();
}

async function requireContent(row: MachineCredential, target: ContentTarget, source: Prisma.TransactionClient) {
  let productId = target.productId;
  const productIds = await allowedMachineProducts(row, source);
  const bindProduct = (id: string) => {
    if (!productIds.includes(id) || (productId && productId !== id)) throw machineDenied();
    productId = id;
  };
  if (productId) {
    bindProduct(productId);
    if (!await source.product.findFirst({ where: { id: productId, scope: row.scope } })) throw machineDenied();
  }
  if (target.productVersionId) {
    const version = await source.productVersion.findFirst({ where: { id: target.productVersionId, scope: row.scope } });
    if (!version) throw machineDenied();
    bindProduct(version.productId);
  }
  if (target.revisionId) {
    const revision = await source.contentRevision.findFirst({ where: { id: target.revisionId, scope: row.scope, domain: row.domain } });
    if (!revision) throw machineDenied();
    bindProduct(revision.productId);
  }
  if (target.profileId) {
    const profile = await source.creativeProfileRevision.findFirst({ where: { id: target.profileId, scope: row.scope } });
    if (!profile) throw machineDenied();
    bindProduct(profile.productId);
    const data = profile.profile as { deliverables?: string[] };
    if (!data.deliverables?.includes(row.domain)) throw new ApiException('CONFLICT', '共同设定未包含当前交付领域', 409);
  }
  if (target.skillSetId) {
    if (!row.permissions.includes('skills:read')) throw machineDenied();
    const set = await source.creativeSkillSet.findFirst({ where: { id: target.skillSetId, scope: row.scope }, include: { bindings: true } });
    if (!set || (target.profileId && set.creativeProfileRevisionId !== target.profileId)) throw machineDenied();
    bindProduct(set.productId);
    const bindings = set.bindings.filter(b => b.domain === row.domain);
    if (!bindings.length) throw machineDenied();
    for (const binding of bindings) await requireSkill(row, binding.skillId, source);
  }
  if (!productId) throw machineDenied();
  let asset: { id: string; fileId: string | null; authoring: Prisma.JsonValue } | null = null;
  if (target.assetId) {
    const existing = await source.campaignAsset.findFirst({ where: { id: target.assetId, scope: row.scope }, include: { productVersion: true } });
    if (!existing || existing.productVersion.productId !== productId ||
      (target.productVersionId && existing.productVersionId !== target.productVersionId) ||
      (existing.kind === 'SCRIPT' ? 'video' : existing.kind.toLowerCase()) !== row.domain) throw machineDenied();
    asset = existing;
  }
  for (const fileId of target.fileIds ?? []) {
    const file = await source.assetFile.findFirst({ where: { id: fileId, scope: row.scope, status: 'AVAILABLE' } });
    if (!file || file.kind.toLowerCase() !== row.domain || file.productVersionId !== target.productVersionId) throw machineDenied();
    const oldPreview = (asset?.authoring as { media?: { previewFileId?: string } } | null)?.media?.previewFileId;
    if (fileId !== asset?.fileId && fileId !== oldPreview &&
      !await source.machineUpload.findFirst({ where: { id: fileId, assetFileId: fileId, credentialId: row.id } })) throw machineDenied();
  }
  if (target.inputs?.length && !row.permissions.includes('context:read')) throw machineDenied();
  for (const input of target.inputs ?? []) {
    const revision = await source.contentRevision.findFirst({ where: { id: input.revisionId, productId, scope: row.scope }, include: { production: true } });
    if (!revision) throw machineDenied();
    if (revision.digest !== input.digest) throw new ApiException('CONFLICT', '输入摘要与指定修订不一致', 409);
    const profileId = revision.creativeProfileRevisionId ?? revision.production?.creativeProfileRevisionId;
    if (target.profileId && profileId && profileId !== target.profileId) throw new ApiException('CONFLICT', '输入使用了不同创作设定', 409);
    if (revision.domain === 'assessment' && row.domain !== 'assessment' && input.locator.kind !== 'question')
      throw new ApiException('VALIDATION_ERROR', '宣传用途需明确选择题目节选', 400);
    if (asset) await rejectAssetCycle(source, row.scope, productId, asset.id, revision.id);
  }
}

async function rejectAssetCycle(source: Prisma.TransactionClient, scope: MachineCredential['scope'], productId: string, assetId: string, revisionId: string) {
  const visited = new Set<string>();
  let pending = [revisionId];
  while (pending.length) {
    const rows = await source.contentRevision.findMany({ where: { id: { in: pending }, scope, productId },
      select: { id: true, assetId: true, inputs: { select: { sourceRevisionId: true } } } });
    if (rows.length !== pending.length) throw machineDenied();
    for (const revision of rows) {
      if (revision.assetId === assetId) throw new ApiException('CONFLICT', '输入形成素材循环依赖，请选择独立来源', 409);
      visited.add(revision.id);
    }
    if (visited.size > 1000) throw new ApiException('CONFLICT', '引用链超出校验范围', 409);
    pending = [...new Set(rows.flatMap(r => r.inputs.map(i => i.sourceRevisionId)))].filter(id => !visited.has(id));
  }
}
