import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { AdminCsvImportSchema, AdminCreateOrderSchema, AdminPageQuerySchema, AdminOrderSchema } from '@orai/contracts/admin';
import { type CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { DeliveryAdminService } from '../redemption/delivery-admin.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma, type Order } from '../generated/prisma/client';
import { AdminMutationService } from './admin-mutation.service';

const querySchema = AdminPageQuerySchema.extend({ platform: z.enum(['douyin','xiaohongshu','manual']).optional(),
  status: z.enum(['pending','fulfilled','refunded','cancelled']).optional(), reference: z.string().trim().max(120).optional() }).strict();
const orderDto = (row: Order) => AdminOrderSchema.parse({ id: row.id, reference: row.reference, productVersionId: row.productVersionId,
  quantity: row.quantity, amountFen: row.amountFen, platform: row.platform.toLowerCase(), scope: row.scope.toLowerCase(),
  status: row.status.toLowerCase(), createdAt: row.createdAt.toISOString(), refundedAt: row.refundedAt?.toISOString() ?? null });

// Bounded RFC 4180 records, including BOM, escaped quotes and quoted newlines.
export function parseOrderCsv(input: string) {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false, closed = false;
  const csv = input.replace(/^\uFEFF/, '');
  const push = () => { row.push(field); field = ''; closed = false; };
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]!;
    if (quoted) {
      if (c === '"') { if (csv[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += c;
    } else if (c === ',') push();
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      push(); if (row.some(value => value.length)) rows.push(row); row = [];
    } else if (c === '"' && !field && !closed) quoted = true;
    else {
      if (c === '"' || closed) throw new ApiException('VALIDATION_ERROR', 'CSV 引号格式不正确', 400);
      field += c;
    }
    if (rows.length > 501 || field.length > 20_000 || row.length > 6) throw new ApiException('VALIDATION_ERROR', 'CSV 超出支持范围', 400);
  }
  if (quoted) throw new ApiException('VALIDATION_ERROR', 'CSV 引号未闭合', 400);
  push(); if (row.some(value => value.length)) rows.push(row);
  const headers = rows.shift()?.map(value => value.trim());
  const required = ['platform','reference','productVersionId','quantity','amountFen'];
  if (!headers || headers.length !== required.length || new Set(headers).size !== required.length || required.some(value => !headers.includes(value)) || rows.length < 1 || rows.length > 500) {
    throw new ApiException('VALIDATION_ERROR', 'CSV 需要规定的五列表头和 1–500 条记录', 400);
  }
  return rows.map((values, index) => ({ row: index + 2, values: values.length === headers.length
    ? Object.fromEntries(headers.map((key, position) => [key, values[position]!.trim()])) : null }));
}

function rowRequestId(batch: string, row: number) {
  const value = createHash('sha256').update(batch + ':' + row).digest().subarray(0, 16);
  value[6] = (value[6]! & 15) | 64; value[8] = (value[8]! & 63) | 128;
  const hex = value.toString('hex');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
type ImportRow = { row: number; status: 'accepted' | 'rejected'; orderId?: string; code?: string; message?: string };

@Injectable()
export class OrdersAdminService {
  constructor(private readonly database: DatabaseService, private readonly mutations: AdminMutationService,
    private readonly delivery: DeliveryAdminService) {}

  async list(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access);
    const args = parseInput(querySchema, query);
    const where: Prisma.OrderWhereInput = { scope: access.scope,
      ...(args.platform ? { platform: args.platform.toUpperCase() as Order['platform'] } : {}),
      ...(args.status ? { status: args.status.toUpperCase() as Order['status'] } : {}),
      ...(args.reference ? { reference: args.reference } : {}) };
    const [rows, total] = await this.database.client.$transaction([
      this.database.client.order.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.database.client.order.count({ where }),
    ]);
    return { items: rows.map(orderDto), total, page: args.page, pageSize: args.pageSize };
  }
  async detail(access: CatalogAdminAccess, inputId: unknown) {
    await this.mutations.administrators.require(access);
    const id = parseInput(IdSchema, inputId).toLowerCase();
    const row = await this.database.client.order.findFirst({ where: { id, scope: access.scope }, include: {
      codes: { select: { id: true, status: true, claimDeadline: true, claimedAt: true, revokedAt: true, batchId: true, replacesCodeId: true, entitlementId: true }, orderBy: { id: 'asc' } },
      batches: { select: { id: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 50 },
    } });
    if (!row) throw new ApiException('NOT_FOUND', '订单不存在于当前管理范围', 404);
    return { ...orderDto(row), codes: row.codes.map(code => ({ ...code, status: code.status.toLowerCase(), claimDeadline: code.claimDeadline.toISOString(),
      claimedAt: code.claimedAt?.toISOString() ?? null, revokedAt: code.revokedAt?.toISOString() ?? null })),
      batches: row.batches.map(batch => ({ id: batch.id, createdAt: batch.createdAt.toISOString() })) };
  }
  async importCsv(access: CatalogAdminAccess, input: unknown) {
    await this.mutations.administrators.require(access);
    const body = parseInput(AdminCsvImportSchema, input), parsed = parseOrderCsv(body.csv);
    // Reserve the exact batch before row transactions. If interrupted, each row
    // retries with the same derived ID; completed rows cannot be duplicated.
    if (!body.dryRun) await this.mutations.run(access, 'orders.import.reserve', body.requestId, { csv: body.csv }, async () => ({
      response: { batchId: body.requestId }, entityKind: 'order_import', entityId: body.requestId,
    }));
    const rows: ImportRow[] = [], references = new Map<string, string>();
    for (const source of parsed) {
      await this.mutations.administrators.require(access);
      try {
        if (!source.values) throw new ApiException('VALIDATION_ERROR', 'CSV 此行列数不正确', 400);
        const values = source.values;
        if (!/^\d+$/.test(values.quantity!) || !/^\d+$/.test(values.amountFen!)) throw new ApiException('VALIDATION_ERROR', '数量和金额必须为整数', 400);
        const request = parseInput(AdminCreateOrderSchema, { ...values, quantity: Number(values.quantity), amountFen: Number(values.amountFen),
          scope: access.scope.toLowerCase(), requestId: rowRequestId(body.requestId.toLowerCase(), source.row) });
        const referenceKey = JSON.stringify([request.platform, request.reference]);
        const content = JSON.stringify([request.productVersionId.toLowerCase(), request.quantity, request.amountFen]);
        if (references.has(referenceKey) && references.get(referenceKey) !== content) throw new ApiException('CONFLICT', '同一批次内订单引用重复且内容不同', 409);
        let orderId: string | undefined;
        if (body.dryRun) {
          const version = await this.database.client.productVersion.findFirst({ where: { id: request.productVersionId, scope: access.scope }, include: { product: true } });
          if (!version || !['PUBLISHED','ARCHIVED'].includes(version.status) || version.product.status !== 'PUBLISHED') throw new ApiException('CONFLICT', '订单需要可用的已发布商品版本', 409);
          const existing = await this.database.client.order.findUnique({ where: { platform_reference: { platform: request.platform.toUpperCase() as Order['platform'], reference: request.reference } } });
          if (existing && (existing.scope !== access.scope || existing.productVersionId !== request.productVersionId || existing.quantity !== request.quantity || existing.amountFen !== request.amountFen)) throw new ApiException('CONFLICT', '订单引用已存在且内容不同', 409);
          orderId = existing?.id;
        } else orderId = (await this.delivery.recordOrder(access, request)).id;
        references.set(referenceKey, content);
        rows.push({ row: source.row, status: 'accepted', ...(orderId ? { orderId } : {}) });
      } catch (error) {
        if (!(error instanceof ApiException) || error.getStatus() >= 500 || ['AUTH_REQUIRED','FORBIDDEN','EMAIL_UNVERIFIED'].includes(error.code)) throw error;
        rows.push({ row: source.row, status: 'rejected', code: error.code, message: error.publicMessage });
      }
    }
    const result = { dryRun: body.dryRun, totalRows: rows.length, accepted: rows.filter(row => row.status === 'accepted').length,
      rejected: rows.filter(row => row.status === 'rejected').length, rows };
    if (body.dryRun) return result;
    return this.mutations.run(access, 'orders.import.complete', body.requestId, { csv: body.csv }, async () => ({
      response: result, entityKind: 'order_import', entityId: body.requestId,
    }));
  }
}
