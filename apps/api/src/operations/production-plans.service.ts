import { Injectable } from '@nestjs/common';
import { IdSchema, CatalogMetadataQuerySchema } from '@orai/contracts';
import { AdminPageQuerySchema, ProductionPlanSaveSchema, ProductionPlanDocumentSchema, ProductionPlanModuleSchema,
  ProductionPlanRevisionSchema, ProductionPlanPageSchema, ProductionPlanInspectionSchema } from '@orai/contracts/admin';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { contentDigest } from './content-projections';
import { inspectProductionPlan } from './production-plan-inspection';
import { ProjectCanvasService } from './project-canvas.service';
import { validateProductPlanReferences } from './product-plan-references';

const id = (value: unknown) => parseInput(IdSchema, value).toLowerCase();
const relations = { modules: { include: { identity: true }, orderBy: { position: 'asc' as const } } } as const;
type PlanRow = Prisma.ProductionPlanRevisionGetPayload<{ include: typeof relations }>;
export function projection(row: PlanRow) {
  const moduleIds = new Map(row.modules.map(module => [module.identity.moduleKey, module.moduleId]));
  return ProductionPlanRevisionSchema.parse({ id: row.id, productId: row.productId, scope: row.scope.toLowerCase(), revision: row.number,
    creativeProfileRevisionId: row.creativeProfileRevisionId, creativeProfileDigest: row.creativeProfileDigest,
    plan: row.document, digest: row.digest, status: 'planning_only', createdAt: row.createdAt.toISOString(),
    modules: row.modules.map(module => { const definition = ProductionPlanModuleSchema.parse(module.definition); return {
      id: module.id, moduleId: module.moduleId, moduleKey: module.identity.moduleKey, digest: module.digest, definition,
      dependencyIds: definition.dependsOn.map(key => moduleIds.get(key)),
    }; }),
  });
}

@Injectable()
export class ProductionPlansService {
  constructor(private readonly db: DatabaseService, private readonly mutations: AdminMutationService, private readonly canvas: ProjectCanvasService) {}
  private async human(access: CatalogAdminAccess, tx?: Prisma.TransactionClient) {
    await this.mutations.administrators.require(access, tx);
  }
  private async product(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string) {
    const row = await tx.product.findFirst({ where: { id: productId, scope: access.scope } });
    if (!row) throw new ApiException('NOT_FOUND', '项目不存在于当前管理范围', 404);
    await this.mutations.administrators.requireProjectRow(access, ['projects:read','projects:write'], { productId }, tx);
    return row;
  }
  private async profile(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string, profileId: string) {
    const row = await tx.creativeProfileRevision.findFirst({ where: { id: id(profileId), productId, scope: access.scope } });
    if (!row) throw new ApiException('NOT_FOUND', '创作设定不属于该项目或当前范围', 404);
    return row;
  }
  async save(access: CatalogAdminAccess, productInput: unknown, input: unknown) {
    await this.human(access);
    const productId = id(productInput), body = parseInput(ProductionPlanSaveSchema, input);
    return this.mutations.run(access, 'production.plan:' + productId, body.requestId, body, async tx => {
      return this.saveIn(tx, access, productId, body);
    });
  }
  async saveIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string, input: unknown, createdId?: string) {
    const body = parseInput(ProductionPlanSaveSchema, input);
      await this.human(access, tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${productId}::uuid AND scope=${access.scope}::orai."DataScope" FOR UPDATE`);
      await this.product(tx, access, productId);
      const latest = await tx.productionPlanRevision.aggregate({ where: { productId, scope: access.scope }, _max: { number: true } });
      if ((latest._max.number ?? 0) !== body.expectedRevision) throw new ApiException('REVISION_CONFLICT', '商品计划已更新，请读取固定修订后重试', 409);
      const profile = await this.profile(tx, access, productId, body.plan.creativeProfileRevisionId);
      await validateProductPlanReferences(tx, access, productId, body.plan);
      const identities = [];
      for (const module of body.plan.modules) {
        let identity = await tx.productionModuleIdentity.findUnique({ where: { productId_moduleKey: { productId, moduleKey: module.moduleKey } } });
        if (identity && identity.domain !== module.domain) throw new ApiException('CONFLICT', '既有模块标识不能换用其他领域，请创建新的模块标识', 409);
        identity ??= await tx.productionModuleIdentity.create({ data: { productId, scope: access.scope, moduleKey: module.moduleKey, domain: module.domain } });
        identities.push(identity);
      }
      const row = await tx.productionPlanRevision.create({ data: { ...(createdId ? { id: createdId } : {}), productId, scope: access.scope, number: body.expectedRevision + 1,
        creativeProfileRevisionId: profile.id, creativeProfileDigest: profile.digest, actorUserId: access.actorUserId,
        document: body.plan, digest: contentDigest({ plan: body.plan, creativeProfileDigest: profile.digest }) } });
      for (const [position, module] of body.plan.modules.entries()) await tx.productionPlanModule.create({ data: { planRevisionId: row.id,
        moduleId: identities[position]!.id, productId, scope: access.scope, position, definition: module, digest: contentDigest(module) } });
      if(body.layout)await this.canvas.initialIn(tx,access,row.id,body.layout);
      return { response: projection(await tx.productionPlanRevision.findUniqueOrThrow({ where: { id: row.id }, include: relations })), entityKind: 'production_plan', entityId: row.id };
  }
  async read(access: CatalogAdminAccess, planInput: unknown, query: unknown = {}) {
    await this.human(access); parseInput(CatalogMetadataQuerySchema, query);
    return this.db.client.$transaction(async tx => {
      await this.human(access, tx);
      const row = await tx.productionPlanRevision.findFirst({ where: { id: id(planInput), scope: access.scope }, include: relations });
      if (!row) throw new ApiException('NOT_FOUND', '商品计划不存在于当前范围', 404);
      await this.mutations.administrators.requireProjectRow(access, ['projects:read'], { productId: row.productId, planRevisionId: row.id }, tx);
      return projection(row);
    });
  }
  async list(access: CatalogAdminAccess, productInput: unknown, query: unknown) {
    await this.human(access);
    const productId = id(productInput), args = parseInput(AdminPageQuerySchema, query);
    return this.db.client.$transaction(async tx => {
      await this.human(access, tx); await this.product(tx, access, productId);
      const where = { productId, scope: access.scope }, rows = await tx.productionPlanRevision.findMany({ where, include: relations,
        orderBy: { number: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize });
      return ProductionPlanPageSchema.parse({ items: rows.map(projection), total: await tx.productionPlanRevision.count({ where }), page: args.page, pageSize: args.pageSize });
    });
  }
  async inspection(access: CatalogAdminAccess, planInput: unknown, query: unknown = {}) {
    const fixed = await this.read(access, planInput, query), inspection = inspectProductionPlan(fixed.plan);
    const { methods, productions } = await this.db.client.$transaction(async tx => {
      await this.mutations.administrators.requireProjectRow(access, ['projects:read'], { productId: fixed.productId, planRevisionId: fixed.id }, tx);
      const where = { scope: access.scope, planModuleId: { in: fixed.modules.map(module => module.id) } };
      return {
        methods: await tx.projectMethodSnapshot.findMany({ where, select: { planModuleId: true, purpose: true } }),
        productions: await tx.projectProductionRecord.findMany({ where, orderBy: { number: 'desc' }, distinct: ['planModuleId'], include: { outputs: true } }),
      };
    });
    for (const item of inspection.modules) {
      const module = fixed.modules.find(module => module.moduleKey === item.moduleKey)!;
      const captured = new Set(methods.filter(method => method.planModuleId === module.id).map(method => method.purpose));
      item.methods = module.definition.methodPurposes.every(purpose => captured.has(purpose)) ? 'captured' : captured.size ? 'partially_captured' : 'required_not_captured';
      const outputs = productions.find(record => record.planModuleId === module.id)?.outputs ?? [];
      if (outputs.length) {
        const complete = module.definition.outputs.filter(output => output.required).every(slot => {
          const candidates = outputs.filter(output => output.outputKey === slot.outputKey);
          return slot.original.representation === 'structured' ? candidates.some(output => output.contentRevisionId !== null)
            : slot.files.filter(file => file.required && file.purpose === 'original').every(file => candidates.some(output =>
              output.fileKey === file.fileKey && (output.fileId !== null || output.originalFileId !== null) && (output.snapshot as { purpose?: string }).purpose === 'original'));
        });
        const hasOriginal = outputs.some(output => (output.snapshot as { purpose?: string }).purpose === 'original');
        item.originals = complete && hasOriginal ? 'recorded_not_revalidated' : hasOriginal ? 'partially_recorded' : 'declared_not_imported';
      }
    }
    return inspection;
  }
  async validate(access: CatalogAdminAccess, productInput: unknown, input: unknown, query: unknown = {}) {
    await this.human(access); parseInput(CatalogMetadataQuerySchema, query);
    const productId = id(productInput), parsed = ProductionPlanDocumentSchema.safeParse(input);
    return this.db.client.$transaction(async tx => {
      await this.human(access, tx); await this.product(tx, access, productId);
      if (!parsed.success) return ProductionPlanInspectionSchema.parse({ checkedAt: new Date().toISOString(), valid: false,
        runtimeValidation: 'not_performed', archiveReady: false, evidence: [], modules: [],
        issues: parsed.error.issues.slice(0,20).map(issue => ({ code: 'INVALID_PLAN', severity: 'error', message: issue.message.slice(0,500), moduleKey: null, evidenceKey: null })) });
      await this.profile(tx, access, productId, parsed.data.creativeProfileRevisionId);
      await validateProductPlanReferences(tx, access, productId, parsed.data);
      const inspection = inspectProductionPlan(parsed.data);
      const identities = await tx.productionModuleIdentity.findMany({ where: { productId, scope: access.scope,
        moduleKey: { in: parsed.data.modules.map(module => module.moduleKey) } } });
      for (const module of parsed.data.modules) if (identities.some(identity => identity.moduleKey === module.moduleKey && identity.domain !== module.domain)) {
        inspection.valid = false;
        inspection.issues.push({ code: 'MODULE_IDENTITY_CONFLICT', severity: 'error', message: '既有模块标识不能换用其他领域，请使用新标识。', moduleKey: module.moduleKey, evidenceKey: null });
      }
      return ProductionPlanInspectionSchema.parse(inspection);
    });
  }
}
