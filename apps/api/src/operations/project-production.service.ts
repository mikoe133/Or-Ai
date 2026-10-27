import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema, CatalogMetadataQuerySchema } from '@orai/contracts';
import { AdminPageQuerySchema, ProjectMethodCaptureSchema, ProjectMethodSnapshotSchema, ProjectMethodPageSchema,
  ProjectProductionSaveSchema, ProjectProductionRecordSchema, ProjectProductionPageSchema, ProjectProductionOutputSchema,
  ProductionPlanModuleSchema, FixedSkillVersionSchema, StyleSkillManifestSchema, SkillPurposeSchema, ProjectEffectiveMethodSchema } from '@orai/contracts/admin';
import { verifyExperienceFiles } from '../catalog/experience-authoring';
import { ExperienceManifestSchema } from '@orai/contracts/experience';
import { allowedMachineSkills } from '../catalog/machine-authorization';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { Prisma, type AssetFile } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { contentDigest } from './content-projections';
import { fixedVersion } from './skill-bindings.service';
import { AssetStorage } from './asset-storage';
import { ProjectOriginalFilesService } from './project-original-files.service';
import { FilesService } from './files.service';
import { createHash } from 'node:crypto';

const id = (value: unknown) => parseInput(IdSchema, value).toLowerCase();
const moduleInclude = { plan: true, identity: true } as const;
const methodInclude = { module: { include: moduleInclude }, references: { include: { file: true } } } as const;
const recordInclude = { module: { include: moduleInclude }, outputs: { orderBy: [{ outputKey: 'asc' }, { fileKey: 'asc' }] } } satisfies Prisma.ProjectProductionRecordInclude;
type ModuleRow = Prisma.ProductionPlanModuleGetPayload<{ include: typeof moduleInclude }>;
type MethodRow = Prisma.ProjectMethodSnapshotGetPayload<{ include: typeof methodInclude }>;
type RecordRow = Prisma.ProjectProductionRecordGetPayload<{ include: typeof recordInclude }>;
type OutputInput = z.infer<typeof ProjectProductionSaveSchema>['outputs'][number];
type OutputSnapshot = Omit<z.infer<typeof ProjectProductionOutputSchema>, 'id' | 'file'> & {
  file: Omit<NonNullable<z.infer<typeof ProjectProductionOutputSchema>['file']>, 'downloadPath'> | null;
};
const methodSnapshotSchema = FixedSkillVersionSchema.extend({ customization: ProjectEffectiveMethodSchema.optional() }).strict();
const storedOutputSchema = ProjectProductionOutputSchema.omit({ id: true, file: true }).extend({
  file: ProjectProductionOutputSchema.shape.file.unwrap().omit({ downloadPath: true }).nullable(),
});
const documentSchema = ProjectProductionRecordSchema.pick({ external: true, inputs: true, methods: true }).extend({
  outputs: z.array(storedOutputSchema).min(1).max(32),
});
const moduleFields = (row: ModuleRow) => ({ productId: row.productId, scope: row.scope.toLowerCase(), planRevisionId: row.planRevisionId,
  planModuleId: row.id, moduleId: row.moduleId, moduleDigest: row.digest,
  creativeProfileRevisionId: row.plan.creativeProfileRevisionId, creativeProfileDigest: row.plan.creativeProfileDigest });
function expandInstructions(base: string, customization: { parameters: Record<string, string | number | boolean>; instructions: string }) {
  const parameters = Object.fromEntries(Object.entries(customization.parameters).sort(([a], [b]) => a.localeCompare(b)));
  return [base, Object.keys(parameters).length ? '\n商品参数（JSON 数据）\n' + JSON.stringify(parameters, null, 2) : '',
    customization.instructions ? '\n本商品补充方法\n' + customization.instructions : ''].filter(Boolean).join('\n');
}
export function methodDto(row: MethodRow) {
  const { customization, ...version } = methodSnapshotSchema.parse(row.snapshot);
  // A draft's current attachments are deliberately irrelevant to this snapshot.
  return ProjectMethodSnapshotSchema.parse({ id: row.id, ...moduleFields(row.module), purpose: row.purpose,
    sourceRevision: row.sourceRevision, version, digest: row.digest, createdAt: row.createdAt.toISOString(),
    ...(customization ? { customization } : {}),
    ...(row.machineCredentialId ? { machineCredentialId: row.machineCredentialId, machineRequestId: row.machineRequestId } : {}),
    status: 'captured', activationEffect: 'none' });
}
export function recordDto(row: RecordRow) {
  const document = documentSchema.parse(row.document);
  return ProjectProductionRecordSchema.parse({ id: row.id, ...moduleFields(row.module), revision: row.number, ...document,
    outputs: row.outputs.map(output => {
      const snapshot = output.snapshot as unknown as OutputSnapshot;
      return { ...snapshot, id: output.id, file: snapshot.file ? { ...snapshot.file,
        downloadPath: `/api/admin/project-productions/${row.id}/outputs/${output.id}/content` } : null };
    }), digest: row.digest, createdAt: row.createdAt.toISOString(), source: row.machineCredentialId ? 'mcp' : 'external_declaration',
    ...(row.machineCredentialId ? { machineCredentialId: row.machineCredentialId, machineRequestId: row.machineRequestId } : {}),
    status: 'saved_outputs', platformExecuted: false, archiveReady: false });
}

@Injectable()
export class ProjectProductionService {
  constructor(private readonly db: DatabaseService, private readonly mutations: AdminMutationService,
    private readonly storage: AssetStorage, private readonly files: FilesService, private readonly originals: ProjectOriginalFilesService) {}
  private async human(access: CatalogAdminAccess, tx?: Prisma.TransactionClient) {
    await this.mutations.administrators.require(access, tx);
  }
  private async module(tx: Prisma.TransactionClient, access: CatalogAdminAccess, input: unknown) {
    await this.human(access, tx);
    const row = await tx.productionPlanModule.findFirst({ where: { id: id(input), scope: access.scope }, include: moduleInclude });
    if (!row) throw new ApiException('NOT_FOUND', '计划模块不存在于当前管理范围', 404);
    await this.mutations.administrators.requireProjectRow(access, ['projects:read','methods:create','content:write'], { productId: row.productId, planRevisionId: row.planRevisionId, planModuleId: row.id }, tx);
    return row;
  }
  private async method(tx: Prisma.TransactionClient, access: CatalogAdminAccess, input: unknown) {
    await this.human(access, tx);
    const row = await tx.projectMethodSnapshot.findFirst({ where: { id: id(input), scope: access.scope }, include: methodInclude });
    if (!row) throw new ApiException('NOT_FOUND', '项目方法快照不存在于当前管理范围', 404);
    await this.mutations.administrators.requireProjectRow(access, ['projects:read','methods:create','content:write'], { productId: row.productId, planRevisionId: row.module.planRevisionId, planModuleId: row.planModuleId, snapshotId: row.id }, tx);
    return row;
  }
  private async verifyMethod(row: MethodRow) {
    const { customization, ...fixed } = methodSnapshotSchema.parse(row.snapshot), manifest = fixed.manifest;
    if (customization && customization.effectiveInstructions !== expandInstructions(manifest.instructions, customization))
      throw new ApiException('CONFLICT', '商品定制与展开后的方法正文不一致', 409);
    if (manifest.references.length !== row.references.length || fixed.files.length !== row.references.length)
      throw new ApiException('CONFLICT', '项目方法参考快照不完整', 409);
    for (const ref of row.references) {
      const metadata = fixed.files.find(item => item.path === ref.path && item.file.id === ref.fileId)?.file;
      if (!metadata || ref.file.status !== 'AVAILABLE' || metadata.checksum !== ref.file.checksum ||
        metadata.byteSize !== ref.file.byteSize || metadata.mimeType !== ref.file.mimeType ||
        !manifest.references.some(item => item.path === ref.path && item.fileId === ref.fileId))
        throw new ApiException('CONFLICT', '项目方法参考文件与固定快照不一致', 409);
      const actual = await this.storage.inspectReference(ref.file.storageKey, metadata.byteSize, metadata.mimeType);
      if (actual.checksum !== metadata.checksum || actual.byteSize !== metadata.byteSize || actual.mimeType !== metadata.mimeType)
        throw new ApiException('VALIDATION_ERROR', '项目方法参考文件已损坏', 400);
    }
  }
  async capture(access: CatalogAdminAccess, moduleInput: unknown, input: unknown) {
    await this.human(access);
    const moduleId = id(moduleInput), body = parseInput(ProjectMethodCaptureSchema, input);
    return this.mutations.run(access, 'project.method:' + moduleId, body.requestId, body, async tx => {
      return this.captureIn(tx, access, moduleId, body);
    });
  }
  async captureIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, moduleId: string, input: unknown) {
    const body = parseInput(ProjectMethodCaptureSchema, input);
    if (access.machineCredentialId) {
      const target = await this.mutations.administrators.requireProjectOperation(access, 'methods:create', tx);
      if (target.sourceVersionId !== body.sourceVersionId) throw new ApiException('FORBIDDEN', '捕获方法必须匹配精确授权的源版本', 403);
    }

      const module = await this.module(tx, access, moduleId), definition = ProductionPlanModuleSchema.parse(module.definition);
      if (module.digest !== body.expectedModuleDigest) throw new ApiException('REVISION_CONFLICT', '计划模块摘要不符', 409);
      if (!definition.methodPurposes.includes(body.purpose)) throw new ApiException('VALIDATION_ERROR', '方法用途不属于该计划模块', 400);
      const source = await tx.styleSkillVersion.findFirst({ where: { id: body.sourceVersionId, scope: access.scope },
        include: { skill: true, attachments: { include: { file: true } } } });
      if (access.machineCredentialId) {
        const credential = await tx.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId } });
        if (!source || !(await allowedMachineSkills(credential, tx)).includes(source.skillId)) throw new ApiException('FORBIDDEN', '源方法未获得此连接授权', 403);
      }
      if (!source) throw new ApiException('NOT_FOUND', '源 Skill 版本不存在于当前范围', 404);
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'skill-library:' + source.skillId},0))`);
      const current = await tx.styleSkillVersion.findUniqueOrThrow({ where: { id: source.id },
        include: { skill: true, attachments: { include: { file: true } } } });
      if (current.revision !== body.expectedSourceRevision || current.digest !== body.expectedSourceDigest)
        throw new ApiException('REVISION_CONFLICT', '源 Skill 草稿已更新，请读取精确修订后重新捕获', 409);
      const manifest = StyleSkillManifestSchema.parse(current.manifest);
      if (current.status === 'ARCHIVED' || manifest.domain !== definition.domain || !manifest.purposes.includes(body.purpose) ||
        !manifest.supportedForms.some(form => form === definition.target.form))
        throw new ApiException('VALIDATION_ERROR', '源 Skill 的状态、领域、用途或形式不符合该模块', 400);
      if (current.digest !== contentDigest(manifest)) throw new ApiException('CONFLICT', '源 Skill 摘要不一致', 409);
      const fixed = fixedVersion(current);
      const customization = body.customization ? { parameters: Object.fromEntries(Object.entries(body.customization.parameters).sort(([a], [b]) => a.localeCompare(b))),
        instructions: body.customization.instructions, effectiveInstructions: expandInstructions(manifest.instructions, body.customization) } : undefined;
      const digest = contentDigest({ planModuleId: module.id, moduleDigest: module.digest, purpose: body.purpose,
        sourceRevision: current.revision, version: fixed, ...(customization ? { customization } : {}) });
      let row = await tx.projectMethodSnapshot.findUnique({ where: { planModuleId_purpose_digest: { planModuleId: module.id, purpose: body.purpose, digest } }, include: methodInclude });
      if (!row) {
        const created = await tx.projectMethodSnapshot.create({ data: { planModuleId: module.id, productId: module.productId, scope: access.scope,
          skillId: current.skillId, sourceVersionId: current.id, sourceRevision: current.revision, purpose: body.purpose,
          snapshot: { ...fixed, ...(customization ? { customization } : {}) }, digest, actorUserId: access.actorUserId,
          ...(access.machineCredentialId ? { machineCredentialId: access.machineCredentialId, machineRequestId: body.requestId } : {}) } });
        for (const ref of manifest.references) await tx.projectMethodReference.create({ data: { snapshotId: created.id,
          skillId: current.skillId, scope: access.scope, fileId: ref.fileId, path: ref.path } });
        row = await tx.projectMethodSnapshot.findUniqueOrThrow({ where: { id: created.id }, include: methodInclude });
      }
      await this.verifyMethod(row);
      return { response: methodDto(row), entityKind: 'project_method', entityId: row.id };
  }
  async readMethod(access: CatalogAdminAccess, methodInput: unknown, query: unknown = {}) {
    await this.human(access); parseInput(CatalogMetadataQuerySchema, query);
    return this.db.client.$transaction(async tx => methodDto(await this.method(tx, access, methodInput)));
  }
  async readMethodIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, key: string) {
    return methodDto(await this.method(tx, access, key));
  }
  async listMethods(access: CatalogAdminAccess, moduleInput: unknown, query: unknown) {
    await this.human(access); const args = parseInput(AdminPageQuerySchema, query);
    return this.db.client.$transaction(async tx => {
      const module = await this.module(tx, access, moduleInput), where = { planModuleId: module.id, scope: access.scope };
      const rows = await tx.projectMethodSnapshot.findMany({ where, include: methodInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (args.page - 1) * args.pageSize, take: args.pageSize });
      return ProjectMethodPageSchema.parse({ items: rows.map(methodDto), total: await tx.projectMethodSnapshot.count({ where }), page: args.page, pageSize: args.pageSize });
    });
  }
  async methodFile(access: CatalogAdminAccess, methodInput: unknown, fileInput: unknown, range?: string) {
    await this.human(access);
    const row = await this.db.client.$transaction(async tx => this.method(tx, access, methodInput));
    const ref = row.references.find(item => item.fileId === id(fileInput));
    if (!ref) throw new ApiException('NOT_FOUND', '参考文件不在该固定方法中', 404);
    await this.verifyMethod(row); await this.human(access);
    return this.files.storedContent(ref.file, range);
  }
  async methodReferenceText(access: CatalogAdminAccess, methodInput: unknown, fileInput: unknown) {
    const row = await this.db.client.$transaction(async tx => this.method(tx, access, methodInput));
    const ref = row.references.find(item => item.fileId === id(fileInput));
    if (!ref || !['text/plain','text/markdown','application/json'].includes(ref.file.mimeType) || ref.file.byteSize > 256 * 1024)
      throw new ApiException('VALIDATION_ERROR', '该方法仅支持读取 256 KiB 以内的文本参考', 400);
    await this.verifyMethod(row);
    const handle = await this.storage.read(ref.file.storageKey);
    try {
      const buffer = Buffer.alloc(ref.file.byteSize + 1); let offset = 0;
      while (offset < buffer.length) { const chunk = await handle.read(buffer, offset, buffer.length - offset, offset);
        if (!chunk.bytesRead) break; offset += chunk.bytesRead; }
      const bytes = buffer.subarray(0, offset);
      if (bytes.length !== ref.file.byteSize || createHash('sha256').update(bytes).digest('hex') !== ref.file.checksum)
        throw new ApiException('CONFLICT', '方法参考文件摘要不一致', 409);
      let text: string;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new ApiException('VALIDATION_ERROR', '方法参考必须为 UTF-8 文本', 400); }
      await this.human(access);
      return { fileId: ref.fileId, path: ref.path, mimeType: ref.file.mimeType, checksum: ref.file.checksum, text };
    } finally { await handle.close(); }
  }
  private async verifiedFile(tx: Prisma.TransactionClient, access: CatalogAdminAccess, module: ModuleRow, fileInput: string) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.asset_files WHERE id=${fileInput}::uuid FOR SHARE`);
    const file = await tx.assetFile.findFirst({ where: { id: fileInput, scope: access.scope, status: 'AVAILABLE', productVersion: { productId: module.productId } } });
    if (!file) throw new ApiException('NOT_FOUND', '产物原文件未就绪或不属于该项目', 404);
    const actual = await this.storage.inspect(file.storageKey, file.byteSize);
    if (actual.checksum !== file.checksum || actual.mimeType !== file.mimeType || actual.byteSize !== file.byteSize)
      throw new ApiException('VALIDATION_ERROR', '产物文件校验失败', 400);
    return file;
  }
  private fileMetadata(file: Pick<AssetFile,'originalName'|'mimeType'|'byteSize'|'checksum'>) {
    return { fileName: file.originalName, mimeType: file.mimeType, byteSize: file.byteSize, checksum: file.checksum };
  }
  private async output(tx: Prisma.TransactionClient, access: CatalogAdminAccess, module: ModuleRow, input: OutputInput) {
    const definition = ProductionPlanModuleSchema.parse(module.definition), slot = definition.outputs.find(item => item.outputKey === input.outputKey);
    if (!slot) throw new ApiException('VALIDATION_ERROR', '产物槽位不在固定计划模块中', 400);
    const snapshot: OutputSnapshot = { kind: input.kind, outputKey: input.outputKey, fileKey: null, purpose: 'original',
      contentRevisionId: null, experienceRevisionId: null, fileId: null, digest: input.kind === 'file' || input.kind === 'original_file' ? input.checksum : input.digest, file: null };
    let productVersionId: string | null = null;
    const attachFile = async (fileId: string, declaredKey?: string) => {
      const declaration = declaredKey ? slot.files.find(item => item.fileKey === declaredKey) : slot.files.find(item => item.purpose === 'original' && item.required);
      if (!declaration) throw new ApiException('VALIDATION_ERROR', '缺少原文件或文件槽位声明', 400);
      const file = await this.verifiedFile(tx, access, module, fileId);
      const expectedKind = definition.domain === 'experience' ? 'EXPERIENCE' : slot.kind === 'video' ? 'VIDEO' : 'COVER';
      if (file.kind !== expectedKind || !declaration.mimeTypes.includes(file.mimeType as never))
        throw new ApiException('VALIDATION_ERROR', '文件实际用途或类型不符合计划声明', 400);
      snapshot.fileId = file.id; snapshot.fileKey = declaration.fileKey; snapshot.purpose = declaration.purpose;
      snapshot.file = this.fileMetadata(file); productVersionId = file.productVersionId;
      return file;
    };
    if (input.kind === 'original_file') {
      const file = await this.originals.verifiedIn(tx, access, input.originalFileId, module.id);
      const declaration = slot.files.find(f => f.fileKey === input.fileKey && f.purpose === 'original');
      if (!declaration || file.outputKey !== input.outputKey || file.fileKey !== input.fileKey || file.checksum !== input.checksum ||
        !declaration.mimeTypes.includes(file.mimeType as never)) throw new ApiException('CONFLICT', '原件与固定文件槽位或摘要不符', 409);
      snapshot.originalFileId = file.id; snapshot.fileKey = file.fileKey; snapshot.file = this.fileMetadata(file);
    } else if (input.kind === 'file') {
      const file = await attachFile(input.fileId, input.fileKey);
      if (file.checksum !== input.checksum) throw new ApiException('REVISION_CONFLICT', '产物文件摘要不符', 409);
    } else if (input.kind === 'content_revision') {
      const row = await tx.contentRevision.findFirst({ where: { id: input.revisionId, productId: module.productId, scope: access.scope } });
      if (!row) throw new ApiException('NOT_FOUND', '内容产物不属于该项目', 404);
      if (row.digest !== input.digest || row.creativeProfileRevisionId !== module.plan.creativeProfileRevisionId)
        throw new ApiException('REVISION_CONFLICT', '内容产物摘要或创作设定不符', 409);
      const domain = slot.kind === 'image' ? 'cover' : ['assessment','report'].includes(slot.kind) ? 'assessment' : slot.kind;
      if (row.domain !== domain) throw new ApiException('VALIDATION_ERROR', '内容产物领域与槽位不符，分镜不能替代视频', 400);
      if (['image','video'].includes(slot.kind)) {
        if (!row.fileId) throw new ApiException('VALIDATION_ERROR', '内容产物未保存实际原文件', 400);
        await attachFile(row.fileId);
      } else if (!['assessment','report','copy'].includes(slot.kind)) throw new ApiException('VALIDATION_ERROR', '该槽位需保存独立原件', 400);
      snapshot.contentRevisionId = row.id; productVersionId = row.productVersionId;
    } else {
      const row = await tx.experienceAuthoringRevision.findFirst({ where: { id: input.revisionId, productId: module.productId, scope: access.scope } });
      if (!row) throw new ApiException('NOT_FOUND', '体验制作稿不属于该项目', 404);
      if (definition.domain !== 'experience' || !['web_bundle','scene_bundle'].includes(slot.kind))
        throw new ApiException('VALIDATION_ERROR', '体验制作稿不属于该交付槽位', 400);
      if (row.digest !== input.digest || row.creativeProfileRevisionId !== module.plan.creativeProfileRevisionId)
        throw new ApiException('REVISION_CONFLICT', '体验制作稿摘要或创作设定不符', 409);
      const manifest = ExperienceManifestSchema.parse(row.manifest), runtime = definition.target.runtime;
      if (!runtime || definition.target.form !== 'web' || contentDigest(runtime.renderer) !== contentDigest(manifest.renderer) ||
        contentDigest(runtime.reportRenderer) !== contentDigest(manifest.report.renderer) || runtime.inputSchema !== manifest.content.inputSchema ||
        runtime.engine !== manifest.content.engine || runtime.reportSchema !== manifest.report.contentSchema)
        throw new ApiException('VALIDATION_ERROR', '体验制作稿与固定运行配对不符', 400);
      // A native authoring manifest is retained, but never substituted for an original web/3D package.
      snapshot.experienceRevisionId = row.id; snapshot.purpose = 'authoring'; productVersionId = row.productVersionId;
    }
    return { snapshot, productVersionId };
  }
  async selectedMethodsIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, moduleId: string,
    expectedDigest: string, selections: { snapshotId: string; digest: string }[]) {
    const module = await this.module(tx, access, moduleId), definition = ProductionPlanModuleSchema.parse(module.definition);
    const methods: ReturnType<typeof methodDto>[] = [];
    if (new Set(selections.map(item => item.snapshotId)).size !== selections.length)
      throw new ApiException('VALIDATION_ERROR', '候选方法快照不能重复', 400);
    if (module.digest !== expectedDigest) throw new ApiException('REVISION_CONFLICT', '计划模块摘要不符', 409);
    for (const choice of selections) {
      const row = await this.method(tx, access, choice.snapshotId);
      if (row.planModuleId !== module.id || row.digest !== choice.digest) throw new ApiException('CONFLICT', '候选方法不属于该固定模块或摘要已变', 409);
      await this.verifyMethod(row); methods.push(methodDto(row));
    }
    if (definition.methodPurposes.some(purpose => !methods.some(method => method.purpose === purpose)))
      throw new ApiException('CONFLICT', '候选方法没有覆盖该模块的全部专业用途', 409);
    return { module, definition, methods };
  }
  async save(access: CatalogAdminAccess, moduleInput: unknown, input: unknown) {
    await this.human(access); const moduleId = id(moduleInput), body = parseInput(ProjectProductionSaveSchema, input);
    return this.mutations.run(access, 'project.production:' + moduleId, body.requestId, body, async tx => {
      return this.saveIn(tx, access, moduleId, body);
    });
  }
  async saveIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, moduleId: string, input: unknown) {
    const body = parseInput(ProjectProductionSaveSchema, input);
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'project-production:' + moduleId},0))`);
      const module = await this.module(tx, access, moduleId), definition = ProductionPlanModuleSchema.parse(module.definition);
      if (module.digest !== body.expectedModuleDigest) throw new ApiException('REVISION_CONFLICT', '计划模块摘要不符', 409);
      const latest = await tx.projectProductionRecord.aggregate({ where: { planModuleId: moduleId }, _max: { number: true } });
      if ((latest._max.number ?? 0) !== body.expectedRevision) throw new ApiException('REVISION_CONFLICT', '模块制作记录已更新', 409);
      const methods: z.infer<typeof ProjectProductionRecordSchema>['methods'] = [];
      for (const selection of [...body.methods].sort((a,b) => a.snapshotId.localeCompare(b.snapshotId))) {
        const row = await this.method(tx, access, selection.snapshotId);
        if (row.planModuleId !== module.id || row.digest !== selection.digest)
          throw new ApiException('VALIDATION_ERROR', '方法快照必须属于本次固定模块并匹配摘要', 400);
        await this.verifyMethod(row); methods.push({ ...selection, purpose: SkillPurposeSchema.parse(row.purpose) });
      }
      if (definition.methodPurposes.some(purpose => !methods.some(method => method.purpose === purpose)))
        throw new ApiException('VALIDATION_ERROR', '制作来源缺少模块要求的专业方法', 400);
      const inputs: z.infer<typeof ProjectProductionRecordSchema>['inputs'] = [];
      for (const input of body.inputs) {
        const row = await tx.projectProductionRecord.findFirst({ where: { id: input.recordId, productId: module.productId, scope: access.scope }, include: { module: true } });
        if (!row || row.digest !== input.digest || row.module.planRevisionId !== module.planRevisionId ||
          !definition.dependsOn.includes(ProductionPlanModuleSchema.parse(row.module.definition).moduleKey))
          throw new ApiException('VALIDATION_ERROR', '制作输入必须固定本计划依赖模块的真实记录及摘要', 400);
        inputs.push({ ...input, planModuleId: row.planModuleId });
      }
      const outputs = [];
      for (const input of body.outputs) outputs.push(await this.output(tx, access, module, input));
      outputs.sort((a,b) => (a.snapshot.outputKey + ':' + (a.snapshot.fileKey ?? 'structured')).localeCompare(b.snapshot.outputKey + ':' + (b.snapshot.fileKey ?? 'structured')));
      if (new Set(outputs.map(row => row.snapshot.outputKey + ':' + (row.snapshot.fileKey ?? 'structured'))).size !== outputs.length)
        throw new ApiException('VALIDATION_ERROR', '解析后的原件槽位重复', 400);
      const document = { external: body.external, methods, inputs, outputs: outputs.map(item => item.snapshot) };
      const digest = contentDigest({ ...moduleFields(module), ...document });
      const record = await tx.projectProductionRecord.create({ data: { planModuleId: module.id, productId: module.productId, scope: access.scope,
        number: body.expectedRevision + 1, document, digest, actorUserId: access.actorUserId,
        ...(access.machineCredentialId ? { machineCredentialId: access.machineCredentialId, machineRequestId: body.requestId } : {}) } });
      for (const method of methods) await tx.projectProductionMethod.create({ data: { recordId: record.id, snapshotId: method.snapshotId,
        planModuleId: module.id, productId: module.productId, scope: access.scope } });
      for (const { snapshot, productVersionId } of outputs) await tx.projectProductionOutput.create({ data: { recordId: record.id,
        productId: module.productId, scope: access.scope, outputKey: snapshot.outputKey, fileKey: snapshot.fileKey ?? 'structured',
        contentRevisionId: snapshot.contentRevisionId, experienceRevisionId: snapshot.experienceRevisionId,
        fileId: snapshot.fileId, originalFileId: snapshot.originalFileId, productVersionId, snapshot, digest: snapshot.digest } });
      return { response: recordDto(await tx.projectProductionRecord.findUniqueOrThrow({ where: { id: record.id }, include: recordInclude })),
        entityKind: 'project_production', entityId: record.id };
  }
  async read(access: CatalogAdminAccess, recordInput: unknown, query: unknown = {}) {
    await this.human(access); parseInput(CatalogMetadataQuerySchema, query);
    return this.db.client.$transaction(async tx => {
      await this.human(access, tx);
      const row = await tx.projectProductionRecord.findFirst({ where: { id: id(recordInput), scope: access.scope }, include: recordInclude });
      if (!row) throw new ApiException('NOT_FOUND', '项目制作来源记录不存在', 404);
      await this.mutations.administrators.requireProjectRow(access, ['projects:read'], { productId: row.productId, planRevisionId: row.module.planRevisionId, planModuleId: row.planModuleId, recordId: row.id }, tx);
      return recordDto(row);
    });
  }
  async list(access: CatalogAdminAccess, moduleInput: unknown, query: unknown) {
    await this.human(access); const args = parseInput(AdminPageQuerySchema, query);
    return this.db.client.$transaction(async tx => {
      const module = await this.module(tx, access, moduleInput), where = { planModuleId: module.id, scope: access.scope };
      const rows = await tx.projectProductionRecord.findMany({ where, include: recordInclude, orderBy: { number: 'desc' },
        skip: (args.page - 1) * args.pageSize, take: args.pageSize });
      return ProjectProductionPageSchema.parse({ items: rows.map(recordDto), total: await tx.projectProductionRecord.count({ where }), page: args.page, pageSize: args.pageSize });
    });
  }
  async verifyRecordIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, recordId: string) {
    await this.human(access, tx);
    const row = await tx.projectProductionRecord.findFirst({ where: { id: recordId, scope: access.scope }, include: recordInclude });
    if (!row) throw new ApiException('NOT_FOUND', '固定制作记录不存在', 404);
    await this.mutations.administrators.requireProjectRow(access, ['projects:read','content:write'], { productId: row.productId,
      planRevisionId: row.module.planRevisionId, planModuleId: row.planModuleId, recordId: row.id }, tx);
    const document = documentSchema.parse(row.document);
    for (const selected of document.methods) {
      const method = await this.method(tx, access, selected.snapshotId);
      if (method.digest !== selected.digest || method.planModuleId !== row.planModuleId) throw new ApiException('CONFLICT','固定制作方法不匹配',409);
      await this.verifyMethod(method);
    }
    for (const output of row.outputs) {
      const fixed = storedOutputSchema.parse(output.snapshot);
      const input: OutputInput = fixed.kind === 'original_file' ? { kind:'original_file',outputKey:fixed.outputKey,fileKey:fixed.fileKey!,originalFileId:fixed.originalFileId!,checksum:fixed.digest }
        : fixed.kind === 'file' ? {kind:'file',outputKey:fixed.outputKey,fileKey:fixed.fileKey!,fileId:fixed.fileId!,checksum:fixed.digest}
        : {kind:fixed.kind,outputKey:fixed.outputKey,revisionId:(fixed.contentRevisionId??fixed.experienceRevisionId)!,digest:fixed.digest};
      const actual = await this.output(tx,access,row.module,input);
      if (fixed.experienceRevisionId) {
        const authored = await tx.experienceAuthoringRevision.findUniqueOrThrow({ where: { id: fixed.experienceRevisionId } });
        await verifyExperienceFiles(tx, ExperienceManifestSchema.parse(authored.manifest), access.scope, this.storage);
      }
      if (contentDigest(storedOutputSchema.parse(actual.snapshot))!==contentDigest(fixed)) throw new ApiException('CONFLICT','固定制作产物与原件不匹配',409);
    }
    return recordDto(row);
  }
  async readRecordIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, recordId: string) {
    await this.human(access, tx);
    const row = await tx.projectProductionRecord.findFirst({ where: { id: recordId, scope: access.scope }, include: recordInclude });
    if (!row) throw new ApiException('NOT_FOUND', '固定制作记录不存在', 404);
    await this.mutations.administrators.requireProjectRow(access, ['projects:read','content:write'], { productId: row.productId,
      planRevisionId: row.module.planRevisionId, planModuleId: row.planModuleId, recordId: row.id }, tx);
    return recordDto(row);
  }
  async outputFile(access: CatalogAdminAccess, recordInput: unknown, outputInput: unknown, range?: string) {
    const record = await this.read(access, recordInput), output = record.outputs.find(item => item.id === id(outputInput));
    if (output?.originalFileId) return this.originals.content(access, output.originalFileId, range);
    if (!output?.fileId || !output.file) throw new ApiException('NOT_FOUND', '此记录没有该产物原文件', 404);
    const file = await this.db.client.$transaction(async tx => this.verifiedFile(tx, access,
      await this.module(tx, access, record.planModuleId), output.fileId!));
    if (file.checksum !== output.file.checksum) throw new ApiException('CONFLICT', '历史产物与固定摘要不一致', 409);
    await this.human(access); return this.files.storedContent(file, range);
  }
}
