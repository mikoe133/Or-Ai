import { Injectable } from '@nestjs/common';
import { EntitlementSchema } from '@orai/contracts/private';
import { Prisma } from '../generated/prisma/client';

export const entitlementMetadataInclude = {
  productVersion: { select: { number: true, product: { select: { id: true, slug: true, name: true } } } },
  attempts: { orderBy: { ordinal: 'desc' }, take: 1, select: { id: true, status: true,
    report: { select: { id: true, expiresAt: true, deletedAt: true } } } },
} as const;
export type EntitlementMetadataRecord = Prisma.EntitlementGetPayload<{ include: typeof entitlementMetadataInclude }>;

@Injectable()
export class EntitlementMetadataService {
  project(record: EntitlementMetadataRecord) {
    const attempt = record.attempts[0], report = attempt?.report;
    const now = new Date();
    return EntitlementSchema.parse({ id: record.id, productId: record.productVersion.product.id,
      productSlug: record.productVersion.product.slug, productName: record.productVersion.product.name,
      versionId: record.productVersionId, versionNumber: record.productVersion.number, ownership: record.ownership.toLowerCase(),
      status: record.status === 'REVOKED' ? 'revoked' : record.status === 'EXPIRED' || record.accessExpiresAt <= now ? 'expired' : 'active',
      reportsAllowed: record.reportsAllowed, reportsConsumed: record.reportsConsumed,
      claimedAt: record.claimedAt.toISOString(), accessExpiresAt: record.accessExpiresAt.toISOString(),
      attemptId: attempt?.id ?? null, attemptStatus: attempt?.status.toLowerCase() ?? null, reportId: report?.id ?? null,
      reportState: !report ? 'absent' : report.deletedAt ? 'deleted' : report.expiresAt <= now ? 'expired' : 'available', isDemo: record.scope === 'DEMO' });
  }
}
