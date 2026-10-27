import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { IdSchema, PageSchema } from '@orai/contracts';
import { MachineCredentialCreateSchema, MachineCredentialSchema, MachineCallSchema, AdminDeliveryActionSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { machineDigest, machineDenied } from '../catalog/machine-authorization';
import { Prisma, type MachineCredential } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';

const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20) }).strict();
export function credentialDto(row: MachineCredential, disabled = false, workspace?: { revokedAt: Date | null; expiresAt: Date } | null) {
  const reason = disabled ? 'owner_disabled' : workspace?.revokedAt ? 'workspace_revoked' :
    workspace && workspace.expiresAt <= new Date() ? 'workspace_expired' : undefined;
  return MachineCredentialSchema.parse({
    id: row.id, name: row.name, scope: row.scope.toLowerCase(), domain: row.domain, permissions: row.permissions,
    productIds: row.productIds, skillIds: row.skillIds, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
    ...(row.workspaceId ? { workspaceId: row.workspaceId } : {}),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    status: row.revokedAt ? 'revoked' : reason ? 'disabled' : row.expiresAt <= new Date() ? 'expired' : 'active',
    ...(!row.revokedAt && reason ? { unavailableReason: reason } : {}),
  });
}
@Injectable()
export class MachineCredentialsService {
  constructor(private readonly database: DatabaseService, private readonly administrators: CatalogAdminAccessService,
    private readonly mutations: AdminMutationService) {}
  private async admin(access: CatalogAdminAccess) {
    await this.administrators.require(access);
    if (access.machineCredentialId) throw machineDenied();
  }
  async list(access: CatalogAdminAccess, input: unknown) {
    await this.admin(access);
    const { page, pageSize } = parseInput(pageSchema, input), where = { scope: access.scope };
    const [rows, total] = await Promise.all([
      this.database.client.machineCredential.findMany({ where, include: { owner: true, workspace: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.database.client.machineCredential.count({ where }),
    ]);
    return PageSchema(MachineCredentialSchema).parse({ items: rows.map(row => credentialDto(row, !!row.owner.disabledAt || row.owner.role !== 'ADMIN', row.workspace)), total, page, pageSize });
  }
  async create(access: CatalogAdminAccess, input: unknown) {
    await this.admin(access);
    const body = parseInput(MachineCredentialCreateSchema, input);
    let issuedToken: string | null = null;
    const result = await this.mutations.run(access, 'machine.credentials.create', body.requestId, body, async tx => {
      const issued = await this.issueIn(access, body, tx);
      const row = issued.credential; issuedToken = issued.token;
      // Store only the public identifier in idempotency; never cache the bearer.
      return { response: { id: row.id }, entityKind: 'machine_credential', entityId: row.id };
    });
    const row = await this.database.client.machineCredential.findUniqueOrThrow({ where: { id: result.id }, include: { owner: true, workspace: true } });
    return { credential: credentialDto(row, !!row.owner.disabledAt || row.owner.role !== 'ADMIN', row.workspace), token: issuedToken };
  }
  async issueIn(access: CatalogAdminAccess, input: unknown, tx: Prisma.TransactionClient, codexConnectionId?: string) {
    await this.administrators.require(access, tx); if (access.machineCredentialId) throw machineDenied();
    const body = parseInput(MachineCredentialCreateSchema, input), expiresAt = new Date(body.expiresAt);
    if (expiresAt.getTime() <= Date.now() + 60_000 || expiresAt.getTime() > Date.now() + 90 * 86_400_000)
      throw new ApiException('VALIDATION_ERROR', '有效期应在 1 分钟至 90 天之间', 400);
    const [products, skills] = await Promise.all([
      tx.product.count({ where: { id: { in: body.productIds }, scope: access.scope } }),
      tx.styleSkill.count({ where: { id: { in: body.skillIds }, scope: access.scope, domain: body.domain } }),
    ]);
    if (products !== body.productIds.length || skills !== body.skillIds.length) throw machineDenied();
    if (body.workspaceId) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.machine_project_workspaces WHERE id=${body.workspaceId}::uuid FOR SHARE`);
      if (!await tx.machineProjectWorkspace.findFirst({ where: { id: body.workspaceId, scope: access.scope,
        ownerUserId: access.actorUserId, revokedAt: null, expiresAt: { gte: expiresAt } } })) throw machineDenied();
    }
    const token = 'orai_mcp_' + randomBytes(32).toString('base64url');
    const credential = await tx.machineCredential.create({ data: { scope: access.scope, ownerUserId: access.actorUserId,
      name: body.name, domain: body.domain, permissions: body.permissions, productIds: body.productIds, skillIds: body.skillIds,
      workspaceId: body.workspaceId, codexConnectionId, tokenDigest: machineDigest(token), expiresAt } });
    return { credential, token };
  }
  async revoke(access: CatalogAdminAccess, idInput: unknown, input: unknown) {
    await this.admin(access);
    const id = parseInput(IdSchema, idInput).toLowerCase(), body = parseInput(AdminDeliveryActionSchema, input);
    await this.mutations.run(access, 'machine.credentials.revoke:' + id, body.requestId, {}, async tx => {
      const row = await tx.machineCredential.findFirst({ where: { id, scope: access.scope } });
      if (!row) throw new ApiException('NOT_FOUND', '连接不存在', 404);
      await tx.machineCredential.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
      return { response: { id }, entityKind: 'machine_credential', entityId: id };
    });
    return credentialDto(await this.database.client.machineCredential.findUniqueOrThrow({ where: { id } }));
  }
  async calls(access: CatalogAdminAccess, idInput: unknown, input: unknown) {
    await this.admin(access);
    const id = parseInput(IdSchema, idInput).toLowerCase(), { page, pageSize } = parseInput(pageSchema, input);
    if (!await this.database.client.machineCredential.findFirst({ where: { id, scope: access.scope } })) throw new ApiException('NOT_FOUND', '连接不存在', 404);
    const where = { credentialId: id, scope: access.scope }, [rows, total] = await Promise.all([
      this.database.client.machineCall.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.database.client.machineCall.count({ where }),
    ]);
    return PageSchema(MachineCallSchema).parse({ items: rows.map(row => ({
      id: row.id, credentialId: row.credentialId, domain: row.domain, operation: row.operation, outcome: row.outcome,
      errorCode: row.errorCode, entityId: row.entityId, requestId: row.requestId, createdAt: row.createdAt.toISOString(),
    })), total, page, pageSize });
  }
  async record(token: string, domain: string, operation: string, error?: unknown, entity?: unknown, request?: unknown) {
    if (!/^orai_mcp_[A-Za-z0-9_-]{43}$/.test(token)) return;
    const row = await this.database.client.machineCredential.findUnique({ where: { tokenDigest: machineDigest(token) } });
    if (!row) return;
    const code = error instanceof ApiException ? error.code : error ? 'INTERNAL_ERROR' : null;
    await this.database.client.machineCall.create({ data: { credentialId: row.id, scope: row.scope, domain, operation,
      outcome: !error ? 'success' : error instanceof ApiException && [401,403,404].includes(error.getStatus()) ? 'denied' : 'failed',
      errorCode: code, entityId: IdSchema.safeParse(entity).success ? String(entity) : null,
      requestId: IdSchema.safeParse(request).success ? String(request) : null } });
  }
}
