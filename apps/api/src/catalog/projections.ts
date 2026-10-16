import { ProductConfigurationSchema, type ProductConfiguration } from '@orai/contracts/admin';
import { ProductCardSchema, ProductDetailSchema, QuestionSchema } from '@orai/contracts';
import type { Category, Product, ProductTag, ProductVersion, Tag } from '../generated/prisma/client';

export type PublicProductRecord = Product & {
  category: Category; tags: (ProductTag & { tag: Tag })[]; currentVersion: ProductVersion | null;
};

export function toPublicProductCard(record: PublicProductRecord) {
  const version = record.currentVersion;
  if (!version || version.status !== 'PUBLISHED' || !record.publishedAt) throw new Error('Product has no public version');
  const configuration = ProductConfigurationSchema.parse(version.configuration);
  const tag = (value: Tag) => ({ id: value.id, slug: value.slug, name: value.name });
  // Construct a new object. Never spread a database record/configuration into a public response.
  return ProductCardSchema.parse({
    id: record.id, slug: record.slug, name: record.name, hook: record.hook, summary: record.summary,
    category: { id: record.category.id, slug: record.category.slug, name: record.category.name, order: record.category.sortOrder },
    tags: record.tags.map(value => tag(value.tag)).sort((left, right) => left.slug.localeCompare(right.slug)),
    price: { amountFen: record.priceFen, currency: record.currency, isTestPrice: record.scope === 'DEMO' },
    durationMinutes: record.durationMinutes, durationIsEstimate: record.durationIsEstimate,
    questionCount: configuration.questions.length, experienceType: record.experienceType.toLowerCase(),
    themeKey: record.themeKey, coverUrl: record.coverUrl, isDemo: record.scope === 'DEMO',
    recommended: record.recommended, publishedAt: record.publishedAt.toISOString(), versionNumber: version.number,
  });
}

export function toPublicProduct(record: PublicProductRecord) {
  return ProductDetailSchema.parse({ ...toPublicProductCard(record),
    versionId: record.currentVersion!.id,
    description: record.description, publicSample: record.publicSample,
    purchaseUrl: record.purchaseUrl, purchaseNotice: record.purchaseNotice, redemptionNotice: record.redemptionNotice,
  });
}

export function toAuthorizedQuestions(configuration: ProductConfiguration) {
  return configuration.questions.map(question => QuestionSchema.parse({
    id: question.id, text: question.text, dimensionId: question.dimensionId, required: question.required,
    options: question.options.map(option => ({ id: option.id, label: option.label, notApplicable: option.notApplicable })),
  }));
}
