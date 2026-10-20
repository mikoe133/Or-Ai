import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { readFileSync, statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { IdSchema, KeySchema } from '@orai/contracts';
import { AppModule } from '../src/app.module';
import { loadConfiguration } from '../src/config/configuration';
import { DatabaseService } from '../src/database/database.service';
import { createDatabaseClient } from '../src/database/client';
import { parseInput } from '../src/common/parse-input';
import { ApiException } from '../src/common/http-errors';
import { CatalogAdminAccessService } from '../src/catalog/admin-access.service';
import { VersionsService } from '../src/catalog/versions.service';
import { assertLocalTarget } from './local-database';

export async function runCatalogCommand(arguments_: string[]) {
  const args = arguments_[0] === '--' ? arguments_.slice(1) : arguments_;
  const { values, positionals } = parseArgs({ args, strict: true, allowPositionals: true,
    options: { actor: { type: 'string' }, product: { type: 'string' }, version: { type: 'string' },
      file: { type: 'string' }, 'request-id': { type: 'string' } },
  });
  const action = positionals[0];
  if (positionals.length !== 1 || !['validate', 'import', 'preview', 'replace', 'review', 'publish', 'archive'].includes(action ?? '')) {
    throw new ApiException('VALIDATION_ERROR', '请选择 validate/import/preview/replace/review/publish/archive 操作', 400);
  }
  const target = assertLocalTarget(process.env);
  const configuration = loadConfiguration(process.env);
  const owner = createDatabaseClient({ ...configuration, databaseUrl: target.migration.toString() });
  let context: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;
  try {
    context = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const administrators = context.get(CatalogAdminAccessService);
    const access = await administrators.authorizeLocalOwner(owner.client, values.actor);
    const versions = context.get(VersionsService);
    const requestId = parseInput(IdSchema, values['request-id'] ?? randomUUID()).toLowerCase();
    let configurationInput: unknown;
    if (['validate', 'import', 'replace'].includes(action!)) {
      if (!values.file || statSync(values.file).size > 512 * 1024 || !statSync(values.file).isFile()) throw new ApiException('VALIDATION_ERROR', '需要不超过 512 KiB 的 JSON 配置文件', 400);
      try { configurationInput = JSON.parse(readFileSync(values.file, 'utf8')); }
      catch { throw new ApiException('INVALID_CONFIGURATION', '配置文件不是有效 JSON', 400); }
    }
    if (action === 'validate') return await versions.validate(access, configurationInput);
    const slug = parseInput(KeySchema, values.product);
    const product = await context.get(DatabaseService).client.product.findFirst({ where: { slug, scope: access.scope } });
    if (!product) throw new ApiException('NOT_FOUND', '当前管理范围没有该商品', 404);
    if (action === 'import') return await versions.importConfiguration(access, product.id, { configuration: configurationInput, requestId });
    if (action === 'archive') return await versions.archive(access, product.id, { requestId });
    if (!values.version || !/^[1-9][0-9]{0,9}$/.test(values.version)) throw new ApiException('VALIDATION_ERROR', '需要合法的版本序号', 400);
    const number = Number(values.version);
    if (number > 2_147_483_647) throw new ApiException('VALIDATION_ERROR', '版本序号超出范围', 400);
    const version = await context.get(DatabaseService).client.productVersion.findUnique({ where: { productId_number: { productId: product.id, number } } });
    if (!version) throw new ApiException('NOT_FOUND', '商品版本不存在', 404);
    switch (action) {
      case 'preview': return await versions.preview(access, product.id, version.id);
      case 'replace': return await versions.replaceDraft(access, product.id, version.id, { configuration: configurationInput, requestId });
      case 'review': return await versions.review(access, product.id, version.id, { requestId });
      case 'publish': return await versions.publish(access, product.id, version.id, { requestId });
      default: throw new ApiException('VALIDATION_ERROR', '操作未实现', 400);
    }
  } finally {
    try { await context?.close(); } finally { await owner.close(); }
  }
}
