import { Injectable } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma } from '../generated/prisma/client';
import { ConsumerAccessService, type ConsumerActor } from './consumer-access.service';
import { RuntimeVersionService } from '../catalog/runtime-version.service';

@Injectable()
export class OwnedRuntimeService {
  constructor(private readonly access: ConsumerAccessService, private readonly versions: RuntimeVersionService) {}
  async entitlement(tx: Prisma.TransactionClient, actor: ConsumerActor, input: unknown, write: boolean) {
    this.access.identity(actor);
    const id = parseInput(IdSchema, input).toLowerCase();
    if (write) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id=${id}::uuid FOR UPDATE`);
    return this.access.requireEntitlement(actor, id, tx);
  }
  async attempt(tx: Prisma.TransactionClient, actor: ConsumerActor, input: unknown, write: boolean) {
    this.access.identity(actor);
    const id = parseInput(IdSchema, input).toLowerCase();
    const reference = await tx.attempt.findFirst({ where: { id, scope: actor.scope }, select: { entitlementId: true } });
    if (!reference) throw new ApiException('NOT_FOUND', '答卷不存在于当前授权中', 404);
    const entitlement = await this.entitlement(tx, actor, reference.entitlementId, write);
    await tx.$queryRaw(write ? Prisma.sql`SELECT id FROM orai.attempts WHERE id=${id}::uuid FOR UPDATE`
      : Prisma.sql`SELECT id FROM orai.attempts WHERE id=${id}::uuid FOR SHARE`);
    const attempt = await tx.attempt.findUniqueOrThrow({ where: { id } });
    if (!attempt.statsValid || attempt.status === 'INVALID') throw new ApiException('FORBIDDEN', '答卷已失效，请查看权益状态', 403);
    return { attempt, entitlement };
  }
  async version(tx: Prisma.TransactionClient, versionId: string, scope: ConsumerActor['scope']) {
    const version = await this.versions.read(versionId, tx);
    if (version.scope !== scope) throw new ApiException('FORBIDDEN', '版本不属于当前授权范围', 403);
    return version;
  }
}
