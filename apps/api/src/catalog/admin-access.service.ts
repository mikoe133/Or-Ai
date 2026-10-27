import { Inject, Injectable, Optional } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma, type PrismaClient, type DataScope } from '../generated/prisma/client';
import { AccountIdentityService, type AccountAccess } from '../accounts/account-identity.service';
import { machineDigest, machineInvalid, machineDenied, machineWorkspace, projectBinding, requireMachineTarget, type MachineRequirement } from './machine-authorization';
import { ProductionDomainSchema } from '@orai/contracts/admin';

declare const adminBrand: unique symbol;
export interface CatalogAdminAccess {
  readonly actorUserId: string;
  readonly scope: DataScope;
  readonly machineCredentialId?: string;
  readonly [adminBrand]: true;
}

const grants = new WeakMap<object, { database: string; expiresAt: number; account?: AccountAccess;
  machine?: { id: string; domain: string; requirement?: MachineRequirement } }>();

@Injectable()
export class CatalogAdminAccessService {
  constructor(private readonly database: DatabaseService, @Inject(APP_CONFIG) private readonly configuration: AppConfiguration,
    @Optional() private readonly accounts?: AccountIdentityService) {}

  // Only an actual bearer proof can mint this in-process capability. HTTP input
  // never supplies an actor, role or an object accepted by require().
  async authorizeMachine(token: string, domainInput: unknown): Promise<CatalogAdminAccess> {
    const domain = parseInput(ProductionDomainSchema, domainInput);
    if (!/^orai_mcp_[A-Za-z0-9_-]{43}$/.test(token)) throw machineInvalid();
    const row = await this.database.client.machineCredential.findUnique({ where: { tokenDigest: machineDigest(token) } });
    if (!row) throw machineInvalid();
    const access = Object.freeze({ actorUserId: row.ownerUserId, scope: row.scope, machineCredentialId: row.id }) as CatalogAdminAccess;
    grants.set(access, { database: new URL(this.configuration.databaseUrl).pathname.slice(1), expiresAt: Date.now() + 300_000,
      machine: { id: row.id, domain } });
    await this.require(access);
    return access;
  }

  async restrictMachine(access: CatalogAdminAccess, requirement: MachineRequirement, tx?: Prisma.TransactionClient) {
    await this.require(access, tx);
    const grant = grants.get(access)!;
    if (!grant.machine) throw machineDenied();
    const restricted = Object.freeze({ ...access }) as CatalogAdminAccess;
    grants.set(restricted, { ...grant, machine: { ...grant.machine, requirement: structuredClone(requirement) } });
    await this.require(restricted, tx);
    return restricted;
  }

  async requireProjectOperation(access: CatalogAdminAccess, permission: MachineRequirement['permission'], tx?: Prisma.TransactionClient) {
    await this.require(access, tx);
    const requirement = grants.get(access)?.machine?.requirement;
    if (!requirement || requirement.target.type !== 'project' || requirement.permission !== permission) throw machineDenied();
    return requirement.target;
  }
  async requireOriginalTarget(access: CatalogAdminAccess, expected: { planModuleId: string; outputKey: string; fileKey: string }, tx?: Prisma.TransactionClient) {
    await this.require(access, tx);
    if (!access.machineCredentialId) return;
    const requirement = grants.get(access)?.machine?.requirement, target = requirement?.target;
    if (!requirement || requirement.permission !== 'content:write' || target?.type !== 'project_original' ||
      target.planModuleId !== expected.planModuleId || target.outputKey !== expected.outputKey || target.fileKey !== expected.fileKey) throw machineDenied();
  }

  async requireProjectRow(access: CatalogAdminAccess, permissions: MachineRequirement['permission'][],
    expected: { productId: string; planRevisionId?: string; planModuleId?: string; snapshotId?: string; recordId?: string; runId?: string; attemptId?: string }, tx: Prisma.TransactionClient) {
    await this.require(access, tx);
    if (!access.machineCredentialId) return;
    const requirement = grants.get(access)?.machine?.requirement;
    if (!requirement || requirement.target.type !== 'project' || !permissions.includes(requirement.permission)) throw machineDenied();
    const credential = await tx.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId } });
    const binding = await projectBinding(credential, requirement.target, tx);
    if (binding.productId !== expected.productId ||
      (binding.planRevisionId && binding.planRevisionId !== expected.planRevisionId) ||
      (binding.planModuleId && binding.planModuleId !== expected.planModuleId) ||
      (binding.runId && expected.runId && binding.runId !== expected.runId) ||
      (binding.attemptId && expected.attemptId && binding.attemptId !== expected.attemptId) ||
      (requirement.target.snapshotId && expected.snapshotId && requirement.target.snapshotId !== expected.snapshotId) ||
      (requirement.target.recordId && expected.recordId && requirement.target.recordId !== expected.recordId)) throw machineDenied();
  }

  async authorizeAccount(account: AccountAccess): Promise<CatalogAdminAccess> {
    if (!this.accounts) throw new ApiException('FORBIDDEN', '需要受信任的管理员授权', 403);
    const user = await this.accounts.requireAdmin(account);
    const access = Object.freeze({ actorUserId: user.id, scope: user.scope }) as CatalogAdminAccess;
    grants.set(access, { database: new URL(this.configuration.databaseUrl).pathname.slice(1),
      expiresAt: Date.now() + 300_000, account });
    return access;
  }

  // T03's local maintenance authority is possession of the real schema-owner
  // credential, not a seed user's UUID. The CLI adds strict loopback targeting.
  // No HTTP controller exposes this factory. T06/T07 will add verified Auth.
  async authorizeLocalOwner(owner: PrismaClient, actorUserId: unknown): Promise<CatalogAdminAccess> {
    if (this.configuration.environment === 'production') throw new ApiException('FORBIDDEN', '本地维护授权不可用于生产', 403);
    const rows = await owner.$queryRaw<{ database: string; ownsSchema: boolean }[]>(Prisma.sql`
      SELECT current_database() AS database, pg_has_role(current_user, n.nspowner, 'USAGE') AS "ownsSchema"
      FROM pg_namespace n WHERE n.nspname = 'orai'`);
    const marker = await owner.environmentMarker.findUnique({ where: { id: 1 } });
    const runtimeDatabase = new URL(this.configuration.databaseUrl).pathname.slice(1);
    const expectedEnvironment = this.configuration.environment === 'test' ? 'TEST' : 'DEVELOPMENT';
    if (rows[0]?.ownsSchema !== true || rows[0].database !== runtimeDatabase || marker?.databaseName !== runtimeDatabase || marker.environment !== expectedEnvironment) {
      throw new ApiException('FORBIDDEN', '维护账号、数据库或环境不符合要求', 403);
    }
    const id = parseInput(IdSchema, actorUserId).toLowerCase();
    const user = await this.database.client.user.findUnique({ where: { id } });
    if (!user || user.role !== 'ADMIN' || user.disabledAt || user.scope !== 'DEMO') throw new ApiException('FORBIDDEN', '需要有效的本地管理员记录', 403);
    const access = Object.freeze({ actorUserId: user.id, scope: user.scope }) as CatalogAdminAccess;
    grants.set(access, { database: runtimeDatabase, expiresAt: Date.now() + 300_000 });
    return access;
  }

  async require(access: unknown, client?: Prisma.TransactionClient): Promise<CatalogAdminAccess> {
    const grant = typeof access === 'object' && access !== null ? grants.get(access) : undefined;
    if (!grant || grant.expiresAt <= Date.now() || grant.database !== new URL(this.configuration.databaseUrl).pathname.slice(1)) {
      throw new ApiException('FORBIDDEN', '需要受信任的管理员授权', 403);
    }
    const actor = access as CatalogAdminAccess;
    if (grant.machine) {
      const source = client ?? this.database.client;
      // Match administrator disable/revoke lock order: user, then credential.
      if (client) {
        await source.$queryRaw(Prisma.sql`SELECT id FROM orai.users WHERE id=${actor.actorUserId}::uuid FOR SHARE`);
        await source.$queryRaw(Prisma.sql`SELECT id FROM orai.machine_credentials WHERE id=${grant.machine.id}::uuid FOR SHARE`);
      }
      const row = await source.machineCredential.findUnique({ where: { id: grant.machine.id } });
      const user = await source.user.findUnique({ where: { id: actor.actorUserId } });
      const scope = this.configuration.environment === 'production' ? 'LIVE' : 'DEMO';
      if (!row || row.revokedAt || row.expiresAt <= new Date() || row.ownerUserId !== actor.actorUserId ||
          row.scope !== actor.scope || row.scope !== scope || !user || user.role !== 'ADMIN' || user.disabledAt || user.scope !== row.scope)
        throw machineInvalid();
      if (row.domain !== grant.machine.domain) throw machineDenied();
      if (row.workspaceId) {
        if (client) await source.$queryRaw(Prisma.sql`SELECT id FROM orai.machine_project_workspaces WHERE id=${row.workspaceId}::uuid FOR SHARE`);
        await machineWorkspace(row, source);
      }
      if (grant.machine.requirement) await requireMachineTarget(row, grant.machine.requirement, source);
      return actor;
    }
    if (grant.account) {
      const user = await this.accounts?.requireAdmin(grant.account, client);
      if (!user || user.id !== actor.actorUserId || user.scope !== actor.scope) throw new ApiException('FORBIDDEN', '管理员授权已失效', 403);
      return actor;
    }
    if (this.configuration.environment === 'production') throw new ApiException('FORBIDDEN', '本地维护授权不可用于生产', 403);
    const source = client ?? this.database.client;
    if (client) await source.$queryRaw(Prisma.sql`SELECT id FROM orai.users WHERE id = ${actor.actorUserId}::uuid FOR SHARE`);
    const marker = await source.environmentMarker.findUnique({ where: { id: 1 } });
    if (marker?.databaseName !== grant.database || marker.environment !== (this.configuration.environment === 'test' ? 'TEST' : 'DEVELOPMENT')) {
      throw new ApiException('FORBIDDEN', '本地维护环境已改变', 403);
    }
    const user = await source.user.findUnique({ where: { id: actor.actorUserId } });
    if (!user || user.role !== 'ADMIN' || user.disabledAt || user.scope !== actor.scope) throw new ApiException('FORBIDDEN', '管理员授权已失效', 403);
    return actor;
  }
}
