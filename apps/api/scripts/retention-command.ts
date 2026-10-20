import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { AdminRetentionPreviewInputSchema } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { CatalogAdminAccessService } from '../src/catalog/admin-access.service';
import { ApiException } from '../src/common/http-errors';
import { parseInput } from '../src/common/parse-input';
import { loadConfiguration } from '../src/config/configuration';
import { createDatabaseClient } from '../src/database/client';
import { RetentionService } from '../src/runtime/retention.service';
import { assertLocalTarget } from './local-database';

export async function runRetentionPreviewCommand(args: string[]) {
  let parsed: ReturnType<typeof parseArgs>;
  try { parsed = parseArgs({ args: args[0] === '--' ? args.slice(1) : args, strict: true,
    options: { actor: { type: 'string' }, 'as-of': { type: 'string' }, page: { type: 'string' }, 'page-size': { type: 'string' } } }); }
  catch { throw new ApiException('VALIDATION_ERROR', '预演参数不正确，请查阅 retention:preview 命令说明', 400); }
  const values = parsed.values;
  const input = parseInput(AdminRetentionPreviewInputSchema, { asOf: values['as-of'],
    page: values.page === undefined ? undefined : Number(values.page),
    pageSize: values['page-size'] === undefined ? undefined : Number(values['page-size']) });
  const target = assertLocalTarget(process.env), configuration = loadConfiguration(process.env);
  const owner = createDatabaseClient({ ...configuration, databaseUrl: target.migration.toString() });
  let context: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;
  try {
    context = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const access = await context.get(CatalogAdminAccessService).authorizeLocalOwner(owner.client, values.actor);
    return await context.get(RetentionService).preview(access, input);
  } finally { try { await context?.close(); } finally { await owner.close(); } }
}
