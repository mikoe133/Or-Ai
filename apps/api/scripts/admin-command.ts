import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { IdSchema } from '@orai/contracts';
import { ApiException } from '../src/common/http-errors';
import { parseInput } from '../src/common/parse-input';
import { Prisma } from '../src/generated/prisma/client';
import { assertDemoDatabase } from './local-database';

interface RoleResult { userId: string; scope: 'demo'; role: 'admin' | 'user'; changed: boolean }

// Separate maintenance process only. The HTTP application never receives the
// schema-owner connection and cannot update users.role with its runtime role.
export async function runAdminCommand(arguments_: string[], env: NodeJS.ProcessEnv = process.env): Promise<RoleResult> {
  const args = arguments_[0] === '--' ? arguments_.slice(1) : arguments_;
  const { values, positionals } = parseArgs({ args, strict: true, allowPositionals: true,
    options: { 'supabase-user': { type: 'string' }, 'request-id': { type: 'string' } } });
  const action = positionals[0];
  if (positionals.length !== 1 || !['grant','revoke'].includes(action ?? '')) throw new ApiException('VALIDATION_ERROR', '请选择 grant/revoke 并指定 Supabase 用户 ID 和 request-id', 400);
  const supabaseUserId = parseInput(IdSchema, values['supabase-user']).toLowerCase();
  const requestId = parseInput(IdSchema, values['request-id']).toLowerCase();
  const { connection } = await assertDemoDatabase(env);
  try {
    const ownership = await connection.client.$queryRaw<{ ownsSchema: boolean }[]>(Prisma.sql`
      SELECT pg_has_role(current_user, nspowner, 'USAGE') AS "ownsSchema" FROM pg_namespace WHERE nspname='orai'`);
    if (!ownership[0]?.ownsSchema) throw new ApiException('FORBIDDEN', '需要本地数据库所有者凭据', 403);
    const operation = 'administrator.' + action;
    const actorKey = 'local-owner:DEMO';
    const digest = createHash('sha256').update(supabaseUserId).digest('hex');
    return await connection.client.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${actorKey + ':' + operation + ':' + requestId},0))`);
      const prior = await tx.idempotentRequest.findUnique({ where: { actorKey_operation_requestId: { actorKey, operation, requestId } } });
      if (prior) {
        if (prior.requestDigest !== digest || prior.expiresAt <= new Date()) throw new ApiException('IDEMPOTENCY_CONFLICT', '请求编号已使用或重试窗口已结束', 409);
        return prior.response as unknown as RoleResult;
      }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.users WHERE supabase_user_id=${supabaseUserId}::uuid FOR UPDATE`);
      const user = await tx.user.findUnique({ where: { supabaseUserId } });
      if (!user || user.scope !== 'DEMO') throw new ApiException('NOT_FOUND', '需要已经登录过的本地用户记录', 404);
      if (user.disabledAt && action === 'grant') throw new ApiException('FORBIDDEN', '停用用户不能被授予管理员权限', 403);
      const role = action === 'grant' ? 'ADMIN' : 'USER';
      await tx.user.update({ where: { id: user.id }, data: { role } });
      const result: RoleResult = { userId: user.id, scope: 'demo', role: role === 'ADMIN' ? 'admin' : 'user', changed: user.role !== role };
      await tx.adminAuditLog.create({ data: { scope: 'DEMO', actorUserId: null, action: operation, entityKind: 'user', entityId: user.id, requestId } });
      await tx.idempotentRequest.create({ data: { actorKey, operation, requestId, requestDigest: digest,
        response: { ...result }, expiresAt: new Date(Date.now() + 86_400_000) } });
      return result;
    });
  } finally { await connection.close(); }
}
