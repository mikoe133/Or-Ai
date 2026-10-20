import { ApiException } from '../common/http-errors';
import type { Prisma } from '../generated/prisma/client';
import { credentialDigest } from '../redemption/credentials';

export function runtimeRequest(scope: string, entitlementId: string, operation: string, requestId: string, payload: unknown) {
  return { actorKey: 'runtime:' + scope + ':' + entitlementId, operation, requestId: requestId.toLowerCase(), requestDigest: credentialDigest(JSON.stringify(payload)) };
}
export async function previousRequest(tx: Prisma.TransactionClient, request: ReturnType<typeof runtimeRequest>) {
  const { requestDigest, ...identity } = request;
  const previous = await tx.idempotentRequest.findUnique({ where: { actorKey_operation_requestId: identity } });
  if (previous && (previous.requestDigest !== requestDigest || previous.expiresAt <= new Date())) {
    throw new ApiException('IDEMPOTENCY_CONFLICT', '请求编号已使用或重试窗口已结束', 409);
  }
  return previous;
}
export async function rememberRequest(tx: Prisma.TransactionClient, request: ReturnType<typeof runtimeRequest>, reference: Prisma.InputJsonObject) {
  await tx.idempotentRequest.create({ data: { ...request, response: reference, expiresAt: new Date(Date.now() + 86_400_000) } });
}
