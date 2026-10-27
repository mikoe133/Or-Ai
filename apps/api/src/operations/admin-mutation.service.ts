import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IdSchema } from '@orai/contracts';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';

@Injectable()
export class AdminMutationService {
  constructor(private readonly database: DatabaseService, readonly administrators: CatalogAdminAccessService) {}

  async run<T extends object>(access: CatalogAdminAccess, operation: string, inputId: string, payload: unknown,
    work: (tx: Prisma.TransactionClient) => Promise<{ response: T; entityKind: string; entityId: string }>): Promise<T> {
    await this.administrators.require(access);
    const requestId = parseInput(IdSchema, inputId).toLowerCase();
    const actorKey = 'operations:' + access.scope + ':' + access.actorUserId +
      (access.machineCredentialId ? ':machine:' + access.machineCredentialId : '');
    const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    try {
      return await this.database.client.$transaction(async tx => {
        await this.administrators.require(access, tx);
        await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${actorKey + ':' + operation + ':' + requestId},0))`);
        const previous = await tx.idempotentRequest.findUnique({ where: { actorKey_operation_requestId: { actorKey, operation, requestId } } });
        if (previous) {
          if (previous.requestDigest !== digest || previous.expiresAt <= new Date()) throw new ApiException('IDEMPOTENCY_CONFLICT', '请求编号已使用或重试窗口已结束', 409);
          return previous.response as T;
        }
        const changed = await work(tx);
        if (access.machineCredentialId) await this.administrators.require(access, tx);
        await tx.adminAuditLog.create({ data: { actorUserId: access.actorUserId, scope: access.scope,
          action: operation.split(':')[0]!, entityKind: changed.entityKind, entityId: changed.entityId, requestId } });
        await tx.idempotentRequest.create({ data: { actorKey, operation, requestId, requestDigest: digest,
          response: changed.response as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 86_400_000) } });
        return changed.response;
      }, { maxWait: 5000, timeout: 15_000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiException('CONFLICT', '记录已存在，请刷新后核对', 409);
      throw error;
    }
  }
}
