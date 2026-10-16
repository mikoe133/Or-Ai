import { Inject, Injectable } from '@nestjs/common';
import { ClientViewEventSchema, AdminPageQuerySchema } from '@orai/contracts/admin';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { type CatalogAdminAccess } from '../catalog/admin-access.service';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { BrowserSecurityService, type BrowserMutationAccess } from '../redemption/browser-security.service';
import { AdminMutationService } from './admin-mutation.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';

@Injectable()
export class OverviewService {
  constructor(private readonly database: DatabaseService, private readonly mutations: AdminMutationService,
    private readonly browser: BrowserSecurityService, @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}

  async overview(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access); parseInput(z.object({}).strict(), query);
    const [events, orders, statuses, products, assets] = await Promise.all([
      this.database.client.event.groupBy({ by: ['kind','source'], where: { scope: access.scope }, _count: { _all: true }, _max: { occurredAt: true } }),
      this.database.client.order.aggregate({ where: { scope: access.scope }, _count: { _all: true }, _sum: { amountFen: true } }),
      this.database.client.order.groupBy({ by: ['status'], where: { scope: access.scope }, _count: { _all: true } }),
      this.database.client.product.count({ where: { scope: access.scope } }),
      this.database.client.campaignAsset.count({ where: { scope: access.scope } }),
    ]);
    return { scope: access.scope.toLowerCase(), generatedAt: new Date().toISOString(), attribution: 'unconfirmed',
      events: events.map(row => ({ kind: row.kind.toLowerCase(), source: row.source.toLowerCase(), count: row._count._all, latestAt: row._max.occurredAt?.toISOString() ?? null })),
      orders: { recordedCount: orders._count._all, recordedAmountFen: orders._sum.amountFen ?? 0, paymentVerified: false,
        statuses: statuses.map(row => ({ status: row.status.toLowerCase(), count: row._count._all })) },
      products, assets };
  }
  async audit(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access);
    const { page, pageSize } = parseInput(AdminPageQuerySchema, query);
    const [items, total] = await this.database.client.$transaction([
      this.database.client.adminAuditLog.findMany({ where: { scope: access.scope }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.database.client.adminAuditLog.count({ where: { scope: access.scope } }),
    ]);
    return { items: items.map(row => ({ ...row, scope: row.scope.toLowerCase(), createdAt: row.createdAt.toISOString() })), total, page, pageSize };
  }
  async view(access: BrowserMutationAccess, input: unknown) {
    const actor = this.browser.requireMutation(access), body = parseInput(ClientViewEventSchema, input);
    const scope = this.configuration.environment === 'production' ? 'LIVE' as const : 'DEMO' as const;
    const digest = createHash('sha256').update(actor.browserDigest + ':' + body.requestId.toLowerCase()).digest('hex');
    const dedupeKey = 'view:' + scope + ':' + digest;
    return this.database.client.$transaction(async tx => {
      const version = await tx.productVersion.findFirst({ where: { id: body.productVersionId, scope, status: 'PUBLISHED', product: { status: 'PUBLISHED', currentVersionId: body.productVersionId } } });
      if (!version) throw new ApiException('NOT_FOUND', '商品当前不可浏览', 404);
      const campaign = body.campaignCode ? await tx.campaign.findFirst({ where: { code: body.campaignCode, scope, productVersionId: version.id } }) : null;
      if (body.campaignCode && !campaign) throw new ApiException('NOT_FOUND', '渠道记录不可用', 404);
      // ON CONFLICT DO NOTHING works atomically across API processes; an empty
      // Prisma upsert can otherwise race between its SELECT and INSERT.
      await tx.event.createMany({ skipDuplicates: true, data: [{ dedupeKey, scope, kind: 'VIEW',
        source: scope === 'DEMO' ? 'DEMO' : 'WEB', productVersionId: version.id, campaignId: campaign?.id ?? null }] });
      const row = await tx.event.findUniqueOrThrow({ where: { dedupeKey } });
      if (row.productVersionId !== version.id || row.campaignId !== (campaign?.id ?? null)) throw new ApiException('IDEMPOTENCY_CONFLICT', '浏览请求编号已用于其他内容', 409);
      return { accepted: true, source: row.source.toLowerCase(), observation: 'client_reported' };
    });
  }
}
