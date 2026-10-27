import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import {
  AdminDeliveryActionSchema, AdminPageQuerySchema, CodexConnectionCreateSchema,
  CodexConnectionIssuedSchema, CodexConnectionPageSchema, CodexConnectionPlanSchema,
  CodexConnectionPreviewSchema, CodexConnectionSchema, codexDomainGrants,
  MachineWorkspaceSchema, type CodexConnectionPlan,
} from '@orai/contracts/admin';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { contentDigest } from './content-projections';
import { MachineProjectsService } from './machine-projects.service';
import { MachineCredentialsService, credentialDto } from './machine-credentials.service';

const id = (value: unknown) => parseInput(IdSchema, value).toLowerCase();
const include = { owner: true, workspace: { include: { _count: { select: { projects: true } } } },
  credentials: { orderBy: { domain: 'asc' as const } } } as const;
type ConnectionRow = Prisma.CodexConnectionGetPayload<{ include: typeof include }>;
const domainLabels = { assessment: '题目与报告', cover: '封面', video: '视频', copy: '文案', experience: '体验' };

@Injectable()
export class CodexConnectionsService {
  constructor(private readonly db: DatabaseService, private readonly admins: CatalogAdminAccessService,
    private readonly mutations: AdminMutationService, private readonly projects: MachineProjectsService,
    private readonly credentials: MachineCredentialsService) {}

  private async human(access: CatalogAdminAccess, tx?: Prisma.TransactionClient) {
    await this.admins.require(access, tx);
    if (access.machineCredentialId) throw new ApiException('FORBIDDEN', '此操作仅供当前管理员使用', 403);
  }

  private normalize(input: unknown): CodexConnectionPlan {
    const plan = parseInput(CodexConnectionPlanSchema, input);
    return { ...plan, expiresAt: new Date(plan.expiresAt).toISOString(),
      workspace: plan.workspace.kind === 'new' ? { ...plan.workspace, categoryIds: [...plan.workspace.categoryIds].sort() } : plan.workspace,
      domains: plan.domains.map(d => ({ ...d, skillIds: [...d.skillIds].sort() })).sort((a, b) => a.domain.localeCompare(b.domain)) };
  }

  private async prepare(tx: Prisma.TransactionClient, access: CatalogAdminAccess, plan: CodexConnectionPlan) {
    await this.human(access, tx);
    const expiresAt = new Date(plan.expiresAt);
    if (expiresAt.getTime() <= Date.now() + 60_000 || expiresAt.getTime() > Date.now() + 90 * 86400_000)
      throw new ApiException('VALIDATION_ERROR', '连接有效期应在 1 分钟至 90 天之间', 400);
    const workspace = plan.workspace.kind === 'existing' ? await tx.machineProjectWorkspace.findFirst({
      where: { id: plan.workspace.id, ownerUserId: access.actorUserId, scope: access.scope },
      include: { _count: { select: { projects: true } } },
    }) : null;
    if (plan.workspace.kind === 'existing' && (!workspace || workspace.revokedAt || workspace.expiresAt < expiresAt))
      throw new ApiException('CONFLICT', '工作区不存在、已失效或早于连接到期，请重新选择', 409);
    const settings = plan.workspace.kind === 'new' ? plan.workspace : workspace!;
    const categories = await tx.category.findMany({ where: { id: { in: settings.categoryIds } },
      select: { id: true, name: true }, orderBy: { id: 'asc' } });
    if (categories.length !== settings.categoryIds.length)
      throw new ApiException('VALIDATION_ERROR', '商品分类已失效，请重新选择', 400);
    const grants = codexDomainGrants(plan);
    const sharedSkills = await tx.styleSkill.findMany({ where: { scope: access.scope,
      id: { in: grants.flatMap(g => g.skillIds) } }, select: { id: true, name: true, domain: true }, orderBy: { id: 'asc' } });
    if (grants.some(g => g.skillIds.some(key => !sharedSkills.some(s => s.id === key && s.domain === g.domain))))
      throw new ApiException('FORBIDDEN', '共享 Skill 不属于当前领域或管理范围', 403);
    const summary = { categories, sharedSkills, existingProjectCount: workspace?._count.projects ?? 0,
      maxProjects: settings.maxProjects, maxMethodsPerProject: settings.maxMethodsPerProject,
      maxRunsPerProject: settings.maxRunsPerProject, workspaceExpiresAt: (workspace?.expiresAt ?? expiresAt).toISOString(),
      grants, canReview: false as const, canPublish: false as const, canReadConsumerData: false as const, canEditSharedSkills: false as const };
    const fixed = { plan, summary, scope: access.scope.toLowerCase() };
    return CodexConnectionPreviewSchema.parse({ ...fixed, digest: contentDigest(fixed) });
  }

  async preview(access: CatalogAdminAccess, input: unknown) {
    await this.human(access);
    const plan = this.normalize(input);
    return this.db.client.$transaction(tx => this.prepare(tx, access, plan),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private dto(row: ConnectionRow) {
    const fixed = CodexConnectionPreviewSchema.parse(row.document);
    const ownerDisabled = !!row.owner.disabledAt || row.owner.role !== 'ADMIN';
    const credentials = row.credentials.map(c => credentialDto(c, ownerDisabled, row.workspace));
    const active = credentials.filter(c => c.status === 'active').length;
    const unavailableReason = ownerDisabled ? 'owner_disabled' : row.workspace.revokedAt ? 'workspace_revoked' :
      row.workspace.expiresAt <= new Date() ? 'workspace_expired' : active !== credentials.length ? 'credential_unavailable' : null;
    const status = row.revokedAt ? 'revoked' : row.expiresAt <= new Date() ? 'expired' :
      ownerDisabled || row.workspace.revokedAt || row.workspace.expiresAt <= new Date() || active === 0 ? 'disabled' :
        active !== credentials.length ? 'partial' : 'active';
    const { ownerUserId: _, _count, ...workspace } = row.workspace;
    return CodexConnectionSchema.parse({ id: row.id, scope: row.scope.toLowerCase(), name: fixed.plan.name,
      plan: fixed.plan, digest: row.digest, summary: fixed.summary, credentials, status, unavailableReason,
      expiresAt: row.expiresAt.toISOString(), createdAt: row.createdAt.toISOString(), revokedAt: row.revokedAt?.toISOString() ?? null,
      workspace: MachineWorkspaceSchema.parse({ ...workspace, scope: row.scope.toLowerCase(),
        projectCount: _count.projects, createdAt: workspace.createdAt.toISOString(), expiresAt: workspace.expiresAt.toISOString(),
        revokedAt: workspace.revokedAt?.toISOString() ?? null, status: workspace.revokedAt ? 'revoked' : workspace.expiresAt <= new Date() ? 'expired' : 'active' }) });
  }

  async read(access: CatalogAdminAccess, inputId: unknown) {
    await this.human(access);
    const key = id(inputId);
    return this.db.client.$transaction(async tx => {
      await this.human(access, tx);
      const row = await tx.codexConnection.findFirst({ where: { id: key, ownerUserId: access.actorUserId, scope: access.scope }, include });
      if (!row) throw new ApiException('NOT_FOUND', '连接不存在于当前管理范围', 404);
      return this.dto(row);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async list(access: CatalogAdminAccess, query: unknown) {
    await this.human(access);
    const { page, pageSize } = parseInput(AdminPageQuerySchema, query);
    return this.db.client.$transaction(async tx => {
      await this.human(access, tx);
      const where = { ownerUserId: access.actorUserId, scope: access.scope };
      const rows = await tx.codexConnection.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize });
      return CodexConnectionPageSchema.parse({ items: rows.map(row => this.dto(row)), total: await tx.codexConnection.count({ where }), page, pageSize });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async create(access: CatalogAdminAccess, input: unknown) {
    await this.human(access);
    const raw = parseInput(CodexConnectionCreateSchema, input), body = { ...raw, plan: this.normalize(raw.plan) };
    const secrets: z.infer<typeof CodexConnectionIssuedSchema>['secrets'] = [];
    try {
      const result = await this.mutations.run(access, 'codex.connection.create', body.requestId, body, async tx => {
        await this.human(access, tx);
        await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'codex-connection:' + access.scope + ':' + access.actorUserId + ':' + body.clientKey},0))`);
        const inputDigest = contentDigest(body.plan);
        const previous = await tx.codexConnection.findUnique({ where: { ownerUserId_scope_clientKey: {
          ownerUserId: access.actorUserId, scope: access.scope, clientKey: body.clientKey } } });
        if (previous) {
          if (previous.inputDigest !== inputDigest) throw new ApiException('IDEMPOTENCY_CONFLICT', '此连接业务编号已用于不同方案，请开始新的设置', 409);
          return { response: { id: previous.id }, entityKind: 'codex_connection', entityId: previous.id };
        }
        if (body.plan.workspace.kind === 'existing')
          await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.machine_project_workspaces WHERE id=${body.plan.workspace.id}::uuid FOR SHARE`);
        const fixed = await this.prepare(tx, access, body.plan);
        if (fixed.digest !== body.expectedDigest) throw new ApiException('REVISION_CONFLICT', '授权摘要已有变化，请重新核对后确认', 409);
        let workspaceId: string;
        if (body.plan.workspace.kind === 'existing') workspaceId = body.plan.workspace.id;
        else {
          const { kind: _, ...settings } = body.plan.workspace;
          workspaceId = (await this.projects.createWorkspaceIn(access, { ...settings,
            name: body.plan.name + '制作空间', expiresAt: body.plan.expiresAt, requestId: body.requestId }, tx)).id;
        }
        const row = await tx.codexConnection.create({ data: { ownerUserId: access.actorUserId, scope: access.scope,
          workspaceId, clientKey: body.clientKey, inputDigest, digest: fixed.digest, document: fixed,
          expiresAt: new Date(body.plan.expiresAt) } });
        for (const grant of fixed.summary.grants) {
          const issued = await this.credentials.issueIn(access, { requestId: body.requestId, name: body.plan.name + ' · ' + domainLabels[grant.domain],
            domain: grant.domain, permissions: grant.permissions, workspaceId, productIds: [], skillIds: grant.skillIds, expiresAt: body.plan.expiresAt }, tx, row.id);
          secrets.push({ credentialId: issued.credential.id, domain: grant.domain, token: issued.token });
        }
        return { response: { id: row.id }, entityKind: 'codex_connection', entityId: row.id };
      });
      const connection = await this.read(access, result.id);
      return CodexConnectionIssuedSchema.parse({ connection, secrets, secretState: secrets.length ? 'issued_once' : 'not_recoverable' });
    } catch (error) { secrets.length = 0; throw error; }
  }

  async revoke(access: CatalogAdminAccess, inputId: unknown, input: unknown) {
    await this.human(access);
    const key = id(inputId), body = parseInput(AdminDeliveryActionSchema, input);
    await this.mutations.run(access, 'codex.connection.revoke:' + key, body.requestId, {}, async tx => {
      await this.human(access, tx);
      const row = await tx.codexConnection.findFirst({ where: { id: key, ownerUserId: access.actorUserId, scope: access.scope } });
      if (!row) throw new ApiException('NOT_FOUND', '连接不存在于当前管理范围', 404);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.codex_connections WHERE id=${key}::uuid FOR UPDATE`);
      const now = new Date();
      await tx.machineCredential.updateMany({ where: { codexConnectionId: key, ownerUserId: access.actorUserId, scope: access.scope, revokedAt: null }, data: { revokedAt: now } });
      await tx.codexConnection.updateMany({ where: { id: key, revokedAt: null }, data: { revokedAt: now } });
      return { response: { id: key }, entityKind: 'codex_connection', entityId: key };
    });
    return this.read(access, key);
  }
}
