import { Inject, Injectable } from '@nestjs/common';
import { CatalogMetadataQuerySchema, CatalogQuerySchema, CategoryListSchema, KeySchema, ProductPageSchema, TagListSchema } from '@orai/contracts';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { Prisma, type DataScope } from '../generated/prisma/client';
import { parseInput } from '../common/parse-input';
import { ApiException } from '../common/http-errors';
import { toPublicProduct, toPublicProductCard } from './projections';

export const catalogInclude = { category: true, tags: { include: { tag: true } }, currentVersion: true } as const;

@Injectable()
export class CatalogService {
  constructor(private readonly database: DatabaseService, @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}

  private visible(): Prisma.ProductWhereInput {
    const scope: DataScope = this.configuration.environment === 'production' ? 'LIVE' : 'DEMO';
    return { scope, status: 'PUBLISHED', publishedAt: { not: null }, currentVersion: { is: { scope, status: 'PUBLISHED' } } };
  }

  async categories(query: unknown = {}) {
    parseInput(CatalogMetadataQuerySchema, query);
    const records = await this.database.client.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    return CategoryListSchema.parse(records.map(record => ({ id: record.id, slug: record.slug, name: record.name, order: record.sortOrder })));
  }

  async tags(query: unknown = {}) {
    parseInput(CatalogMetadataQuerySchema, query);
    const records = await this.database.client.tag.findMany({
      where: { products: { some: { product: this.visible() } } }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return TagListSchema.parse(records.map(record => ({ id: record.id, slug: record.slug, name: record.name })));
  }

  async list(input: unknown = {}) {
    const query = parseInput(CatalogQuerySchema, input);
    const conditions: Prisma.ProductWhereInput[] = [this.visible()];
    if (query.q) {
      // Prisma's PostgreSQL contains uses LIKE. Treat user %/_/backslash as
      // literal keyword characters, rather than wildcard operators.
      const contains = query.q.replace(/[\\%_]/g, '\\$&');
      conditions.push({ OR: ['name', 'hook', 'summary', 'description'].map(field => ({ [field]: { contains, mode: 'insensitive' } })) });
    }
    if (query.category) conditions.push({ category: { slug: query.category } });
    for (const slug of query.tags ?? []) conditions.push({ tags: { some: { tag: { slug } } } });
    if (query.minPriceFen !== undefined || query.maxPriceFen !== undefined) conditions.push({ priceFen: { gte: query.minPriceFen, lte: query.maxPriceFen } });
    if (query.minDurationMinutes !== undefined || query.maxDurationMinutes !== undefined) conditions.push({ durationMinutes: { gte: query.minDurationMinutes, lte: query.maxDurationMinutes } });
    if (query.experienceType) conditions.push({ experienceType: query.experienceType === 'score' ? 'SCORE' : 'TENDENCY' });
    const where: Prisma.ProductWhereInput = { AND: conditions };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = query.sort === 'recommended'
      ? [{ recommended: 'desc' }, { recommendationOrder: 'asc' }, { publishedAt: 'desc' }, { id: 'asc' }]
      : [{ publishedAt: 'desc' }, { id: 'asc' }];
    // Both queries see one database snapshot, even if a publisher changes the
    // directory between the count and page reads.
    const { total, records } = await this.database.client.$transaction(async tx => {
      // A transaction owns one pg connection. Await each query to avoid queuing
      // concurrent client.query calls, which pg is deprecating.
      const total = await tx.product.count({ where });
      const records = await tx.product.findMany({ where, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: catalogInclude });
      return { total, records };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return ProductPageSchema.parse({ items: records.map(toPublicProductCard), total, page: query.page, pageSize: query.pageSize });
  }

  async detail(input: unknown, query: unknown = {}) {
    parseInput(CatalogMetadataQuerySchema, query);
    const slug = parseInput(KeySchema, input);
    const record = await this.database.client.product.findFirst({ where: { AND: [this.visible(), { slug }] }, include: catalogInclude });
    if (!record) throw new ApiException('NOT_FOUND', '商品不存在或暂未公开', 404);
    return toPublicProduct(record);
  }
}
