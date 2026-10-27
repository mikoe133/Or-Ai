import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  ProductionDomainSchema, ContentRevisionSchema, MachineContentOperationSchema,
  MachineContentListInputSchema, MachineContentListSchema, MachineContentGetInputSchema, MachineContentGetSchema,
  MachineAssetDraftSaveSchema, MachineAssessmentDraftSaveSchema, MachineAssessmentValidateSchema, MachineAssessmentCheckSchema,
  MachineSkillListInputSchema, MachineSkillListSchema, MachineSkillVersionGetSchema, MachineSkillVersionSchema,
  MachineSkillDraftSaveSchema, MachineSkillDraftCloneSchema, MachineContextInputSchema, MachineContextSchema,
  MachineReferencesValidateSchema, MachineReferencesResultSchema, MachineSkillReferenceGetSchema, MachineSkillReferenceSchema,
  productCapabilities,
  type MachineContentOperation,
} from '@orai/contracts/admin';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { machineDenied, allowedMachineSkills, type MachineRequirement } from '../catalog/machine-authorization';
import { VersionsService } from '../catalog/versions.service';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { ContentService } from './content.service';
import { ContentWorkflowService } from './content-workflow.service';
import { SkillsService } from './skills.service';
import { SkillBindingsService } from './skill-bindings.service';
import { purposeDomain } from '@orai/contracts/admin';
import { MachineExperienceService } from './machine-experience.service';

// Bound snapshots retain their historical shape; cookie download URLs never
// become machine capabilities. References are read through the scoped tool.
function withoutBrowserPaths<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutBrowserPaths) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'downloadPath').map(([key, item]) =>
    [key, withoutBrowserPaths(item)])) as T;
  return value;
}
function skillVersion(value: Awaited<ReturnType<SkillsService['readVersion']>>) {
  return MachineSkillVersionSchema.parse({ ...value, files: value.files.map(ref => {
    const { uploadPath: _upload, downloadPath: _download, ...file } = ref.file;
    return { path: ref.path, file };
  }) });
}

@Injectable()
export class MachineContentService {
  constructor(private readonly database: DatabaseService, private readonly administrators: CatalogAdminAccessService,
    private readonly content: ContentService, private readonly skills: SkillsService,
    private readonly bindings: SkillBindingsService, private readonly workflow: ContentWorkflowService,
    private readonly versions: VersionsService, private readonly experiences: MachineExperienceService) {}

  async execute(access: CatalogAdminAccess, domainInput: unknown, operationInput: unknown, input: unknown) {
    await this.administrators.require(access);
    const domain = parseInput(ProductionDomainSchema, domainInput), operation = parseInput(MachineContentOperationSchema, operationInput);
    const credential = await this.database.client.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
    if (credential.domain !== domain) throw machineDenied();
    if (domain !== 'experience' && operation === 'experience_validate') throw machineDenied();
    const result = domain === 'experience' && (!operation.startsWith('skill_') || operation === 'skill_reference_get')
      ? await this.experiences.execute(access, operation, input) : await this.dispatch(access, domain, operation, input);
    // Reads that assemble several service projections cannot return data after
    // a mid-call revoke. Mutations additionally revalidate inside their commit.
    await this.administrators.require(access);
    return result;
  }
  private restrict(access: CatalogAdminAccess, requirement: MachineRequirement) {
    return this.administrators.restrictMachine(access, requirement);
  }
  private async dispatch(access: CatalogAdminAccess, domain: string, operation: MachineContentOperation, input: unknown): Promise<unknown> {
    switch (operation) {
      case 'list': {
        const body = parseInput(MachineContentListInputSchema, input);
        const scoped = await this.restrict(access, { permission: 'content:read', target: { type: 'content', productId: body.productId.toLowerCase() } });
        const result = await this.content.list(scoped, {
          productId: body.productId, domain, page: body.page, pageSize: body.pageSize, ...(body.current ? { current: 'true' } : {}),
        });
        return MachineContentListSchema.parse({ ...result, items: result.items.map(({ snapshot: _snapshot, ...summary }) => summary) });
      }
      case 'get': {
        const body = parseInput(MachineContentGetInputSchema, input);
        const scoped = await this.restrict(access, { permission: 'content:read', target: { type: 'content', revisionId: body.revisionId.toLowerCase() } });
        const { inputs: _inputs, deliveryFile: _delivery, previewFile: _preview, production, ...revision } = await this.content.read(scoped, body.revisionId);
        const grant = await this.database.client.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
        let source = null;
        if (production) {
          const { actorUserId: _actor, skillVersions, ...rest } = production;
          const allowedSkills = await allowedMachineSkills(grant, this.database.client);
          const versions = Array.isArray(skillVersions) ? skillVersions.filter(item => {
            const binding = item as { domain: string; version: { skillId: string } };
            return grant.permissions.includes('skills:read') && binding.domain === domain && allowedSkills.includes(binding.version.skillId);
          }) : [];
          source = withoutBrowserPaths({ ...rest, ...(versions.length ? { skillVersions: versions } : {}) });
        }
        return MachineContentGetSchema.parse({ ...revision, production: source });
      }
      case 'draft_save': {
        if (domain === 'assessment') {
          const body = parseInput(MachineAssessmentDraftSaveSchema, input);
          const scoped = await this.restrict(access, { permission: 'content:write', target: {
            type: 'content', productId: body.productId.toLowerCase(), productVersionId: body.productVersionId?.toLowerCase(),
            profileId: body.creativeProfileRevisionId.toLowerCase(), skillSetId: body.skillSetId.toLowerCase(),
          } });
          const { skillSetId, batchKey, externalLabel, ...draft } = body;
          return ContentRevisionSchema.parse(await this.content.saveAssessment(scoped, { ...draft,
            production: { source: 'mcp', skillSetId, skillVersionId: null, batchKey: batchKey ?? null, externalLabel: externalLabel ?? null },
          }));
        }
        const body = parseInput(MachineAssetDraftSaveSchema, input);
        const kind = body.authoring.content.kind;
        if ((kind === 'script' ? 'video' : kind) !== domain) throw machineDenied();
        const scoped = await this.restrict(access, { permission: 'content:write', target: {
          type: 'content', productVersionId: body.productVersionId.toLowerCase(), assetId: body.assetId?.toLowerCase(),
          profileId: body.authoring.creativeProfileRevisionId.toLowerCase(), skillSetId: body.authoring.production.skillSetId.toLowerCase(),
          inputs: body.authoring.inputs.map(i => ({ revisionId: i.sourceRevisionId.toLowerCase(), digest: i.sourceDigest, locator: i.locator })),
          fileIds: [body.fileId, body.authoring.media.previewFileId].filter((v): v is string => !!v).map(v => v.toLowerCase()),
        } });
        return ContentRevisionSchema.parse(await this.content.saveAsset(scoped, { ...body, authoring: { ...body.authoring,
          production: { ...body.authoring.production, source: 'mcp', skillVersionId: null },
        } }));
      }
      case 'assessment_validate': {
        if (domain !== 'assessment') throw machineDenied();
        const body = parseInput(MachineAssessmentValidateSchema, input);
        const scoped = await this.restrict(access, { permission: 'content:write', target: { type: 'content', productId: body.productId.toLowerCase() } });
        return MachineAssessmentCheckSchema.parse(await this.versions.validate(scoped, body.configuration));
      }
      case 'skill_list': {
        parseInput(MachineSkillListInputSchema, input);
        const scoped = await this.restrict(access, { permission: 'skills:read', target: { type: 'skill' } });
        const grant = await this.database.client.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
        const items = [];
        for (const skillId of (await allowedMachineSkills(grant, this.database.client)).slice(0,100)) {
          const value = await this.skills.read(scoped, domain, skillId);
          const { manifest: _manifest, files: _files, scope: _scope, ...latest } = value.latest;
          items.push({ ...value, latest });
        }
        return MachineSkillListSchema.parse({ items });
      }
      case 'skill_version_get': {
        const body = parseInput(MachineSkillVersionGetSchema, input);
        const scoped = await this.restrict(access, { permission: 'skills:read',
          target: { type: 'skill', skillId: body.skillId.toLowerCase(), versionId: body.versionId.toLowerCase() } });
        return skillVersion(await this.skills.readVersion(scoped, domain, body.skillId, body.versionId));
      }
      case 'skill_draft_save': {
        const { skillId, versionId, ...body } = parseInput(MachineSkillDraftSaveSchema, input);
        if (body.manifest.domain !== domain) throw machineDenied();
        const scoped = await this.restrict(access, { permission: 'skills:write', target: { type: 'skill', skillId: skillId.toLowerCase(),
          versionId: versionId.toLowerCase(), fileIds: body.manifest.references.map(r => r.fileId.toLowerCase()) } });
        return skillVersion(await this.skills.save(scoped, domain, skillId, versionId, body));
      }
      case 'skill_draft_clone': {
        const { skillId, ...body } = parseInput(MachineSkillDraftCloneSchema, input);
        if (body.manifest && body.manifest.domain !== domain) throw machineDenied();
        const scoped = await this.restrict(access, { permission: 'skills:write', extraPermissions: ['skills:read'], target: {
          type: 'skill', skillId: skillId.toLowerCase(), versionId: body.sourceVersionId.toLowerCase(),
          fileIds: body.manifest?.references.map(reference => reference.fileId.toLowerCase()),
        } });
        return skillVersion(await this.skills.clone(scoped, domain, skillId, body));
      }
      case 'context_bundle_get':
      case 'references_validate': {
        const parsed = operation === 'context_bundle_get' ? parseInput(MachineContextInputSchema, input) : parseInput(MachineReferencesValidateSchema, input);
        const targetRevisionId = 'targetRevisionId' in parsed && typeof parsed.targetRevisionId === 'string' ? parsed.targetRevisionId : undefined;
        const { includeCapabilities, capabilityVersion, ...body } = MachineContextInputSchema.parse({ creativeProfileRevisionId: parsed.creativeProfileRevisionId,
          skillSetId: parsed.skillSetId, inputs: parsed.inputs, includeCapabilities: parsed.includeCapabilities, capabilityVersion: parsed.capabilityVersion });
        const scoped = await this.restrict(access, { permission: 'context:read', extraPermissions: targetRevisionId ? ['content:read'] : [],
          target: { type: 'content', profileId: body.creativeProfileRevisionId.toLowerCase(), skillSetId: body.skillSetId.toLowerCase(),
            revisionId: targetRevisionId?.toLowerCase(), inputs: body.inputs.map(i => ({ ...i, revisionId: i.revisionId.toLowerCase() })) } });
        const source = withoutBrowserPaths(await this.content.context(scoped, { ...body, domain }));
        const context = MachineContextSchema.parse({ ...source, ...(includeCapabilities ? { capabilities: productCapabilities({
          profile: source.creativeProfile.profile, profileRevisionId: source.creativeProfile.id, hasContentVersion: false, capabilityVersion,
        }) } : {}) });
        if (operation === 'context_bundle_get') return context;
        let impact = null;
        if (targetRevisionId) {
          const target = await this.content.read(scoped, targetRevisionId);
          if ((target.creativeProfileRevisionId ?? target.production?.creativeProfileRevisionId) !== body.creativeProfileRevisionId.toLowerCase())
            throw new ApiException('CONFLICT', '复查目标与共同创作设定不一致', 409);
          impact = { ...await this.workflow.impact(scoped, targetRevisionId), reviewNote: null };
        }
        return MachineReferencesResultSchema.parse({ valid: true, context, impact });
      }
      case 'skill_reference_get': {
        const body = parseInput(MachineSkillReferenceGetSchema, input);
        if (purposeDomain[body.purpose] !== domain) throw machineDenied();
        const scoped = await this.restrict(access, { permission: 'context:read',
          target: { type: 'content', skillSetId: body.skillSetId.toLowerCase() } });
        const set = await this.bindings.domain(scoped, body.skillSetId, domain, body.purpose);
        const ref = set.skillVersions.flatMap(b => b.version.files).find(r => r.file.id === body.fileId.toLowerCase());
        if (!ref) throw machineDenied();
        if (!['text/markdown', 'text/plain', 'application/json'].includes(ref.file.mimeType) || ref.file.byteSize > 256 * 1024)
          throw new ApiException('VALIDATION_ERROR', '此工具支持 256 KiB 以内的文本参考；图片/PDF 请在运营后台查看', 400);
        const result = await this.bindings.reference(scoped, body.skillSetId, domain, body.purpose, body.fileId);
        const chunks: Buffer[] = []; let length = 0;
        for await (const chunk of result.stream) {
          const bytes = Buffer.from(chunk); length += bytes.length;
          if (length > 256 * 1024) { result.stream.destroy(); throw new ApiException('CONFLICT', '参考文件超出限制', 409); }
          chunks.push(bytes);
        }
        const bytes = Buffer.concat(chunks);
        if (bytes.length !== ref.file.byteSize || createHash('sha256').update(bytes).digest('hex') !== ref.file.checksum)
          throw new ApiException('CONFLICT', '参考文件完整性校验失败', 409);
        let text: string;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
        catch { throw new ApiException('VALIDATION_ERROR', '参考文件必须为有效的 UTF-8 文本', 400); }
        return MachineSkillReferenceSchema.parse({ fileId: ref.file.id, path: ref.path, mimeType: ref.file.mimeType, checksum: ref.file.checksum, text });
      }
    }
  }
}
