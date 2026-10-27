import { Injectable } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { ProductConfigurationSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import type { Prisma } from '../generated/prisma/client';
import { experienceRelease } from './experience-release';

@Injectable()
export class RuntimeVersionService {
  constructor(private readonly database: DatabaseService) {}

  // Internal primitive for T04/T05 after entitlement authorization. Never bind
  // this method directly to a controller or return its configuration publicly.
  async read(versionId: unknown, tx?: Prisma.TransactionClient) {
    const id = parseInput(IdSchema, versionId).toLowerCase();
    const version = await (tx ?? this.database.client).productVersion.findFirst({ where: { id, status: { in: ['PUBLISHED', 'ARCHIVED'] } },
      include: { product: { select: { name: true } }, experienceRelease: true } });
    if (!version) throw new ApiException('NOT_FOUND', '可用历史版本不存在', 404);
    const configuration = parseInput(ProductConfigurationSchema, version.configuration, 'INVALID_CONFIGURATION');
    return { id: version.id, productId: version.productId, productName: version.product.name, scope: version.scope, number: version.number,
      configuration, experience: experienceRelease(version.experienceRelease, configuration, version.creativeProfileRevisionId) };
  }
}
