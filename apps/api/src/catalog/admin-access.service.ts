import { Inject, Injectable, Optional } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma, type PrismaClient, type DataScope } from '../generated/prisma/client';
import { AccountIdentityService, type AccountAccess } from '../accounts/account-identity.service';

declare const adminBrand: unique symbol;
export interface CatalogAdminAccess {
  readonly actorUserId: string;
  readonly scope: DataScope;
  readonly [adminBrand]: true;
}

const grants = new WeakMap<object, { database: string; expiresAt: number; account?: AccountAccess }>();

@Injectable()
export class CatalogAdminAccessService {
  constructor(private readonly database: DatabaseService, @Inject(APP_CONFIG) private readonly configuration: AppConfiguration,
    @Optional() private readonly accounts?: AccountIdentityService) {}

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
