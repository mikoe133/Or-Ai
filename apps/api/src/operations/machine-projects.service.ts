import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { MachineWorkspaceCreateSchema, MachineWorkspaceSchema, AdminPageQuerySchema,
  MachineProjectOperationSchema, MachineProjectBootstrapSchema, MachineProjectListSchema,
  MachineProjectGetSchema, MachineProjectResultSchema, MachineProjectPageSchema, MachineProjectProfileSaveSchema,
  MachineProjectPlanGetSchema, MachineProjectPlanSaveSchema, MachineProjectPlanValidateSchema,
  MachineProjectMethodCreateSchema, MachineProjectMethodCaptureSchema, MachineProjectMethodGetSchema,
  MachineProjectProductionSaveSchema, MachineProjectProductionListSchema, MachineProjectProductionGetSchema,
  MachineProjectDraftSaveSchema, MachineProjectDraftResultSchema, ProductionPlanDocumentSchema,
  MachineProjectContextGetSchema, MachineProjectContextSchema, MachineProjectMethodReferenceGetSchema,
} from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { machineWorkspace, machineDenied, type MachineRequirement, type ProjectTarget } from '../catalog/machine-authorization';
import { Prisma, type MachineProject, type MachineProjectWorkspace } from '../generated/prisma/client';
import { parseInput } from '../common/parse-input';
import { ApiException } from '../common/http-errors';
import { AdminMutationService } from './admin-mutation.service';
import { CatalogAdminService } from './catalog-admin.service';
import { ContentService } from './content.service';
import { SkillsService } from './skills.service';
import { ProductionPlansService } from './production-plans.service';
import { ProjectProductionService } from './project-production.service';
import { ExperienceAuthoringService } from './experience-authoring.service';
import { contentDigest, contentFragment, profileDto } from './content-projections';

// Never return cookie download paths as machine capabilities.
export function machineProjection<T>(value: T): T {
  if (Array.isArray(value)) return value.map(machineProjection) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['downloadPath','uploadPath'].includes(key)).map(([key, item]) => [key, machineProjection(item)])) as T;
  return value;
}
@Injectable()
export class MachineProjectsService {
  constructor(private readonly db: DatabaseService, private readonly administrators: CatalogAdminAccessService,
    private readonly mutations: AdminMutationService, private readonly catalog: CatalogAdminService,
    private readonly content: ContentService, private readonly skills: SkillsService,
    private readonly plans: ProductionPlansService, private readonly production: ProjectProductionService,
    private readonly experience: ExperienceAuthoringService) {}
  private async human(access: CatalogAdminAccess, tx?: Prisma.TransactionClient) {
    await this.administrators.require(access, tx); if (access.machineCredentialId) throw machineDenied();
  }
  private workspaceDto(row: MachineProjectWorkspace & { _count: { projects: number } }) {
    const { ownerUserId: _, _count, ...publicRow } = row;
    return MachineWorkspaceSchema.parse({ ...publicRow, scope: row.scope.toLowerCase(),
      createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), revokedAt: row.revokedAt?.toISOString() ?? null,
      projectCount: row._count.projects, status: row.revokedAt ? 'revoked' : row.expiresAt <= new Date() ? 'expired' : 'active' });
  }
  async createWorkspace(access: CatalogAdminAccess, input: unknown) {
    await this.human(access); const body = parseInput(MachineWorkspaceCreateSchema, input);
    const result = await this.mutations.run(access, 'machine.workspace.create', body.requestId, body, async tx => {
      const row = await this.createWorkspaceIn(access, body, tx);
      return { response: { id: row.id }, entityKind: 'machine_workspace', entityId: row.id };
    });
    return this.workspaceDto(await this.db.client.machineProjectWorkspace.findUniqueOrThrow({ where: { id: result.id }, include: { _count: { select: { projects: true } } } }));
  }
  async createWorkspaceIn(access: CatalogAdminAccess, input: unknown, tx: Prisma.TransactionClient) {
    await this.human(access, tx);
    const body = parseInput(MachineWorkspaceCreateSchema, input), expiresAt = new Date(body.expiresAt);
    if (expiresAt.getTime() <= Date.now() + 60_000 || expiresAt.getTime() > Date.now() + 90 * 86400_000)
      throw new ApiException('VALIDATION_ERROR', '工作区有效期应在 1 分钟至 90 天之间', 400);
    if (await tx.category.count({ where: { id: { in: body.categoryIds } } }) !== body.categoryIds.length) throw machineDenied();
    const { requestId: _, ...data } = body;
    return tx.machineProjectWorkspace.create({ data: { ...data, expiresAt, scope: access.scope, ownerUserId: access.actorUserId } });
  }
  async workspaces(access: CatalogAdminAccess, input: unknown) {
    await this.human(access); const args = parseInput(AdminPageQuerySchema, input), where = { scope: access.scope, ownerUserId: access.actorUserId };
    const rows = await this.db.client.machineProjectWorkspace.findMany({ where, include: { _count: { select: { projects: true } } },
      orderBy: { createdAt: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize });
    return { items: rows.map(row => this.workspaceDto(row)), total: await this.db.client.machineProjectWorkspace.count({ where }), ...args };
  }
  async revokeWorkspace(access: CatalogAdminAccess, key: unknown, input: unknown) {
    await this.human(access); const id = parseInput(IdSchema, key).toLowerCase(), body = parseInput(z.object({ requestId: IdSchema }).strict(), input);
    return this.mutations.run(access, 'machine.workspace.revoke:' + id, body.requestId, {}, async tx => {
      await this.human(access, tx);
      const row = await tx.machineProjectWorkspace.findFirst({ where: { id, scope: access.scope, ownerUserId: access.actorUserId } });
      if (!row) throw machineDenied();
      await tx.machineProjectWorkspace.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
      return { response: { id }, entityKind: 'machine_workspace', entityId: id };
    });
  }
  private restrict(access: CatalogAdminAccess, permission: MachineRequirement['permission'], target: Omit<ProjectTarget,'type'>,
    extraPermissions: MachineRequirement['permission'][] = [], tx?: Prisma.TransactionClient) {
    return this.administrators.restrictMachine(access, { permission, extraPermissions, target: { type: 'project', ...target } }, tx);
  }
  private summary(row: MachineProject, status = 'draft') {
    return { productId: row.productId, workspaceId: row.workspaceId, projectKey: row.projectKey,
      status, createdAt: row.createdAt.toISOString() };
  }
  private async result(tx: Prisma.TransactionClient, row: MachineProject, initial = false) {
    const product = initial ? null : await tx.product.findUniqueOrThrow({ where: { id: row.productId } });
    const plan = initial ? null : await tx.productionPlanRevision.findFirst({ where: { productId: row.productId }, orderBy: { number: 'desc' } });
    const version = initial ? null : await tx.productVersion.findFirst({ where: { productId: row.productId, status: 'DRAFT' }, orderBy: { number: 'desc' } });
    return MachineProjectResultSchema.parse({ ...this.summary(row, product?.status.toLowerCase()), creativeProfileRevisionId: plan?.creativeProfileRevisionId ?? row.initialProfileId,
      planRevisionId: plan?.id ?? row.initialPlanId, productVersionId: version?.id ?? null });
  }
  async execute(access: CatalogAdminAccess, operationInput: unknown, input: unknown): Promise<unknown> {
    await this.administrators.require(access);
    const op = parseInput(MachineProjectOperationSchema, operationInput);
    const result = await this.dispatch(access, op, input);
    await this.administrators.require(access); return machineProjection(result);
  }
  private async dispatch(access: CatalogAdminAccess, op: z.infer<typeof MachineProjectOperationSchema>, input: unknown): Promise<unknown> {
    switch (op) {
      case 'project_bootstrap': return this.bootstrap(access, input);
      case 'project_list': {
        parseInput(MachineProjectListSchema, input); const scoped = await this.restrict(access, 'projects:read', { list: true });
        return this.db.client.$transaction(async tx => {
          await this.administrators.require(scoped, tx);
          const c = await tx.machineCredential.findUniqueOrThrow({ where: { id: scoped.machineCredentialId! } });
          const rows = await tx.machineProject.findMany({ where: { workspaceId: c.workspaceId!, scope: access.scope }, include: { product: { select: { status: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
          return MachineProjectPageSchema.parse({ items: rows.map(row => this.summary(row, row.product.status.toLowerCase())) });
        });
      }
      case 'project_get': {
        const b = parseInput(MachineProjectGetSchema, input), scoped = await this.restrict(access, 'projects:read', b);
        return this.db.client.$transaction(async tx => { await this.administrators.require(scoped, tx);
          return this.result(tx, await tx.machineProject.findUniqueOrThrow({ where: { productId: b.productId } })); });
      }
      case 'project_profile_save': {
        const { productId, ...b } = parseInput(MachineProjectProfileSaveSchema, input);
        return this.content.saveProfile(await this.restrict(access, 'projects:write', { productId }), productId, b);
      }
      case 'project_plan_get': {
        const b = parseInput(MachineProjectPlanGetSchema, input);
        return this.plans.read(await this.restrict(access, 'projects:read', b), b.planRevisionId);
      }
      case 'project_plan_save': {
        const { productId, ...b } = parseInput(MachineProjectPlanSaveSchema, input);
        return this.plans.save(await this.restrict(access, 'projects:write', { productId }), productId, b);
      }
      case 'project_plan_validate': {
        const b = parseInput(MachineProjectPlanValidateSchema, input);
        return this.plans.validate(await this.restrict(access, 'projects:read', { productId: b.productId }), b.productId, b.plan);
      }
      case 'project_method_create': return this.createMethod(access, input);
      case 'project_method_capture': {
        const { planModuleId, ...b } = parseInput(MachineProjectMethodCaptureSchema, input);
        return this.production.capture(await this.restrict(access, 'methods:create', { planModuleId, sourceVersionId: b.sourceVersionId }, ['skills:read']), planModuleId, b);
      }
      case 'project_method_get': {
        const b = parseInput(MachineProjectMethodGetSchema, input);
        return this.production.readMethod(await this.restrict(access, 'projects:read', b, ['skills:read']), b.snapshotId);
      }
      case 'project_method_reference_get': {
        const b = parseInput(MachineProjectMethodReferenceGetSchema, input);
        const scoped = await this.restrict(access, 'projects:read', { snapshotId: b.snapshotId }, ['skills:read']);
        return this.production.methodReferenceText(scoped, b.snapshotId, b.fileId);
      }
      case 'project_context_get': {
        const b = parseInput(MachineProjectContextGetSchema, input);
        const scoped = await this.restrict(access, 'projects:read', { planRevisionId: b.planRevisionId }, ['context:read']);
        const plan = await this.plans.read(scoped, b.planRevisionId);
        const checked = await this.administrators.restrictMachine(access, { permission: 'context:read', target: {
          type: 'content', productId: plan.productId, inputs: b.inputs } });
        return this.db.client.$transaction(async tx => {
          await this.administrators.require(scoped, tx); await this.administrators.require(checked, tx);
          const credential = await tx.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
          const profile = await tx.creativeProfileRevision.findUniqueOrThrow({ where: { id: plan.creativeProfileRevisionId } }), inputs = [];
          for (const selection of b.inputs) {
            const row = await tx.contentRevision.findFirstOrThrow({ where: { id: selection.revisionId, productId: plan.productId, scope: access.scope } });
            if (row.creativeProfileRevisionId && row.creativeProfileRevisionId !== profile.id) throw new ApiException('CONFLICT', '输入与计划的共同设定不一致', 409);
            inputs.push({ ...selection, productVersionId: row.productVersionId, content: contentFragment(row, selection.locator, credential.domain) });
          }
          return MachineProjectContextSchema.parse({ planRevisionId: plan.id, productId: plan.productId, creativeProfile: profileDto(profile), domain: credential.domain, inputs });
        });
      }
      case 'project_production_save': {
        const { planModuleId, ...b } = parseInput(MachineProjectProductionSaveSchema, input);
        return this.production.save(await this.restrict(access, 'content:write', { planModuleId }, ['skills:read','context:read']), planModuleId, b);
      }
      case 'project_production_list': {
        const { planModuleId, ...b } = parseInput(MachineProjectProductionListSchema, input);
        return this.production.list(await this.restrict(access, 'projects:read', { planModuleId }, ['skills:read']), planModuleId, b);
      }
      case 'project_production_get': {
        const b = parseInput(MachineProjectProductionGetSchema, input);
        return this.production.read(await this.restrict(access, 'projects:read', b, ['skills:read']), b.recordId);
      }
      case 'project_draft_save': return this.saveDraft(access, input);
    }
  }
  private async bootstrap(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(MachineProjectBootstrapSchema, input);
    const grant = await this.db.client.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
    if (!grant.workspaceId || !['projects:create','projects:write'].every(p => grant.permissions.includes(p)))
      throw new ApiException('FORBIDDEN', '此连接未获项目创建授权，请由管理员预建项目或签发受限工作区', 403);
    // Validate the full graph before opening a transaction. The real ID is server generated.
    ProductionPlanDocumentSchema.parse({ ...body.plan, creativeProfileRevisionId: randomUUID() });
    const scoped = await this.restrict(access, 'projects:create', { bootstrap: true }, ['projects:write']);
    return this.mutations.run(scoped, 'machine.project.bootstrap', body.requestId, body, async tx => {
      const credential = await tx.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'machine-workspace:' + credential.workspaceId},0))`);
      const workspace = await machineWorkspace(credential, tx), { requestId: _, ...identity } = body, digest = contentDigest(identity);
      const previous = await tx.machineProject.findUnique({ where: { workspaceId_projectKey: { workspaceId: workspace.id, projectKey: body.projectKey } } });
      if (previous) {
        if (previous.creatorCredentialId !== credential.id || previous.bootstrapDigest !== digest)
          throw new ApiException('IDEMPOTENCY_CONFLICT', '项目业务键已由其他凭证或不同输入使用', 409);
        return { response: await this.result(tx, previous, true), entityKind: 'machine_project', entityId: previous.productId };
      }
      if (!workspace.categoryIds.includes(body.product.categoryId)) throw machineDenied();
      if (await tx.machineProject.count({ where: { workspaceId: workspace.id } }) >= workspace.maxProjects)
        throw new ApiException('CONFLICT', '项目创建额度已用完，请联系管理员', 409);
      const product = await this.catalog.createIn(tx, scoped, { ...body.product, requestId: body.requestId,
        scope: access.scope.toLowerCase(), tagIds: [], recommended: false, coverUrl: null, purchaseUrl: null,
        publicSample: { ...body.product.publicSample, isDemo: access.scope === 'DEMO' },
        purchaseNotice: '草稿，尚未开放购买', redemptionNotice: '草稿，尚未开放兑换' });
      const initialProfileId = randomUUID(), initialPlanId = randomUUID();
      const row = await tx.machineProject.create({ data: { productId: product.response.id, scope: access.scope,
        workspaceId: workspace.id, creatorCredentialId: credential.id, projectKey: body.projectKey,
        bootstrapDigest: digest, initialProfileId, initialPlanId } });
      const writer = await this.restrict(access, 'projects:write', { productId: row.productId }, [], tx);
      await this.content.saveProfileIn(tx, writer, row.productId, { profile: body.profile, requestId: body.requestId, expectedRevision: 0 }, initialProfileId);
      await this.plans.saveIn(tx, writer, row.productId, { plan: { ...body.plan, creativeProfileRevisionId: initialProfileId },
        requestId: body.requestId, expectedRevision: 0 }, initialPlanId);
      return { response: await this.result(tx, row, true), entityKind: 'machine_project', entityId: row.productId };
    });
  }
  private async createMethod(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(MachineProjectMethodCreateSchema, input), scoped = await this.restrict(access, 'methods:create', { productId: body.productId });
    return this.mutations.run(scoped, 'machine.project.method', body.requestId, body, async tx => {
      const credential = await tx.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'machine-workspace:' + credential.workspaceId},0))`);
      const workspace = await machineWorkspace(credential, tx), { requestId: _, ...identity } = body, digest = contentDigest(identity);
      if (body.manifest.domain !== credential.domain) throw machineDenied();
      const previous = await tx.machineProjectSkill.findUnique({ where: { productId_domain_methodKey: { productId: body.productId, domain: credential.domain, methodKey: body.methodKey } } });
      if (previous) {
        if (previous.creatorCredentialId !== credential.id || previous.inputDigest !== digest)
          throw new ApiException('IDEMPOTENCY_CONFLICT', '方法业务键已由其他凭证或不同输入使用', 409);
        return { response: { skillId: previous.skillId, versionId: previous.initialVersionId }, entityKind: 'project_skill', entityId: previous.skillId };
      }
      if (await tx.machineProjectSkill.count({ where: { productId: body.productId } }) >= workspace.maxMethodsPerProject)
        throw new ApiException('CONFLICT', '此项目的方法创建额度已用完', 409);
      const created = await this.skills.createIn(tx, scoped, credential.domain,
        { slug: 'project-' + randomUUID(), manifest: body.manifest, requestId: body.requestId }, body.productId);
      await tx.machineProjectSkill.create({ data: { productId: body.productId, scope: access.scope, skillId: created.response.skillId,
        domain: credential.domain, methodKey: body.methodKey, inputDigest: digest, initialVersionId: created.response.versionId, creatorCredentialId: credential.id } });
      return created;
    });
  }
  private async saveDraft(access: CatalogAdminAccess, input: unknown) {
    const { payload, ...base } = parseInput(MachineProjectDraftSaveSchema, input), body = { ...base, ...payload }, scoped = await this.restrict(access, 'content:write', { planModuleId: body.planModuleId }, ['skills:read','context:read']);
    return this.mutations.run(scoped, 'machine.project.draft', body.requestId, body, async tx => {
      const { module, definition, methods } = await this.production.selectedMethodsIn(tx, scoped, body.planModuleId, body.expectedModuleDigest, body.methods);
      const source = { source: 'mcp', skillSetId: null, skillVersionId: null, batchKey: null, externalLabel: null };
      const profileId = module.plan.creativeProfileRevisionId;
      let output: { id: string; productVersionId: string; sourceRevision?: number; revision?: number; digest: string };
      if (body.kind === 'assessment') {
        if (definition.domain !== 'assessment') throw machineDenied();
        output = (await this.content.saveAssessmentIn(tx, scoped, { productId: module.productId, productVersionId: body.productVersionId,
          configuration: body.configuration, creativeProfileRevisionId: profileId, expectedRevision: body.expectedRevision,
          requestId: body.requestId, production: source }, module.id)).response;
      } else if (body.kind === 'asset') {
        const draft = body.draft, domain = draft.authoring.content.kind === 'script' ? 'video' : draft.authoring.content.kind;
        if (definition.domain !== domain || draft.authoring.creativeProfileRevisionId !== profileId) throw machineDenied();
        const checked = await this.administrators.restrictMachine(access, { permission: 'content:write', target: { type: 'content',
          productId: module.productId, productVersionId: draft.productVersionId, profileId, assetId: draft.assetId,
          fileIds: [draft.fileId, draft.authoring.media.previewFileId].filter((v): v is string => !!v),
          inputs: draft.authoring.inputs.map(i => ({ revisionId: i.sourceRevisionId, digest: i.sourceDigest, locator: i.locator })) } }, tx);
        await this.administrators.require(checked, tx);
        output = (await this.content.saveAssetIn(tx, scoped, { ...draft, requestId: body.requestId,
          authoring: { ...draft.authoring, production: source } }, module.id)).response;
      } else {
        if (definition.domain !== 'experience' || body.draft.manifest.creativeProfileRevisionId !== profileId) throw machineDenied();
        const version = await tx.productVersion.findFirst({ where: { id: body.productVersionId, productId: module.productId, scope: access.scope } });
        if (!version) throw machineDenied();
        for (const resource of body.draft.manifest.resources) {
          if (!await tx.machineUpload.findFirst({ where: { credentialId: access.machineCredentialId, assetFileId: resource.fileId } }) &&
            !await tx.experienceAuthoringResource.findFirst({ where: { fileId: resource.fileId, productVersionId: version.id, scope: access.scope } })) throw machineDenied();
        }
        output = await this.experience.saveCandidateIn(tx, scoped, module.id, module.productId, version.id,
          { ...body.draft, methods: [], requestId: body.requestId, source: 'external_ai' },
          methods.map(method => ({ purpose: method.purpose, domain: 'experience' as const, version: method.version })));
      }
      await tx.projectCandidateDraft.create({ data: { productId: module.productId, scope: access.scope, planModuleId: module.id,
        contentRevisionId: body.kind === 'experience' ? null : output.id, experienceRevisionId: body.kind === 'experience' ? output.id : null,
        methods: body.methods, digest: output.digest, machineCredentialId: access.machineCredentialId!, machineRequestId: body.requestId } });
      return { response: MachineProjectDraftResultSchema.parse({ kind: body.kind, revisionId: output.id, productVersionId: output.productVersionId,
        revision: output.sourceRevision ?? output.revision, digest: output.digest, status: 'draft', platformExecuted: false }),
        entityKind: 'project_candidate_draft', entityId: output.id };
    });
  }
}
