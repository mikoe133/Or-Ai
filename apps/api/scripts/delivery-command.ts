import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { constants, closeSync, fchmodSync, fsyncSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { IdSchema } from '@orai/contracts';
import { AdminOrderInputSchema } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { loadConfiguration } from '../src/config/configuration';
import { createDatabaseClient } from '../src/database/client';
import { ApiException } from '../src/common/http-errors';
import { parseInput } from '../src/common/parse-input';
import { CatalogAdminAccessService } from '../src/catalog/admin-access.service';
import { DeliveryAdminService } from '../src/redemption/delivery-admin.service';
import { assertLocalTarget } from './local-database';

function argumentsFor(args: string[]) {
  try { return parseArgs({ args: args[0] === '--' ? args.slice(1) : args, strict: true, allowPositionals: true,
    options: { actor: { type: 'string' }, input: { type: 'string' }, order: { type: 'string' }, 'code-id': { type: 'string' },
      'request-id': { type: 'string' }, output: { type: 'string' } } }); }
  catch { throw new ApiException('VALIDATION_ERROR', '维护参数不正确，请查阅 delivery:manage 命令说明', 400); }
}
function readOrder(path: string | undefined) {
  try {
    if (!path || !statSync(path).isFile() || statSync(path).size > 512 * 1024) throw new Error();
    return parseInput(AdminOrderInputSchema, JSON.parse(readFileSync(path, 'utf8')));
  } catch { throw new ApiException('VALIDATION_ERROR', '需要有效且不超过 512 KiB 的订单 JSON 文件', 400); }
}

export async function runDeliveryCommand(args: string[]) {
  const { values, positionals } = argumentsFor(args), action = positionals[0];
  if (positionals.length !== 1 || !['order', 'issue', 'replace', 'refund'].includes(action ?? '')) throw new ApiException('VALIDATION_ERROR', '请选择 order/issue/replace/refund 操作', 400);
  const allowed = action === 'order' ? ['actor', 'request-id', 'input'] : action === 'replace' ? ['actor', 'request-id', 'code-id', 'output']
    : action === 'issue' ? ['actor', 'request-id', 'order', 'output'] : ['actor', 'request-id', 'order'];
  if (Object.keys(values).some(key => !allowed.includes(key))) throw new ApiException('VALIDATION_ERROR', '当前操作不接受这些参数', 400);
  const target = assertLocalTarget(process.env), configuration = loadConfiguration(process.env);
  const owner = createDatabaseClient({ ...configuration, databaseUrl: target.migration.toString() });
  let context: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;
  try {
    context = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const access = await context.get(CatalogAdminAccessService).authorizeLocalOwner(owner.client, values.actor);
    const delivery = context.get(DeliveryAdminService), requestId = parseInput(IdSchema, values['request-id'] ?? randomUUID()).toLowerCase();
    if (action === 'order') return await delivery.recordOrder(access, { ...readOrder(values.input), requestId });
    const id = parseInput(IdSchema, action === 'replace' ? values['code-id'] : values.order).toLowerCase();
    if (action === 'refund') return await delivery.refundOrder(access, id, { requestId });
    if (!values.output || !isAbsolute(values.output)) throw new ApiException('VALIDATION_ERROR', '发码/补发需要明确的绝对交付文件路径', 400);
    mkdirSync(dirname(values.output), { recursive: true, mode: 0o700 });
    let fd: number;
    try { fd = openSync(values.output, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600); }
    catch { throw new ApiException('CONFLICT', '交付文件已存在或不可创建，请查看原文件或选择新路径', 409); }
    let committed = false, keepFile = false;
    try {
      const result = action === 'issue' ? await delivery.issueOrder(access, id, { requestId }) : await delivery.replaceCode(access, id, { requestId });
      committed = true;
      if (result.deliveryAvailable) {
        try { fchmodSync(fd, 0o600); writeFileSync(fd, JSON.stringify(result, null, 2) + '\n'); fsyncSync(fd); keepFile = true; }
        catch { throw new ApiException('ASSET_UNAVAILABLE', '发码已完成但交付文件保存失败，请按批次核单补发：' + result.receipt.batchId, 503); }
      }
      // Raw codes are only in the protected file, never process stdout/logs.
      return { receipt: result.receipt, deliveryAvailable: result.deliveryAvailable, deliveredCount: result.deliveries.length,
        deliveryFile: keepFile ? values.output : null };
    } finally {
      closeSync(fd);
      if (!keepFile && (!committed || !statSync(values.output).size)) unlinkSync(values.output);
    }
  } finally { try { await context?.close(); } finally { await owner.close(); } }
}
