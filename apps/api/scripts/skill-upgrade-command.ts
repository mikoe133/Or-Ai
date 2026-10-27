import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { lstat, readFile, open, rm, type FileHandle } from 'node:fs/promises';
import { AppModule } from '../src/app.module';
import { loadConfiguration } from '../src/config/configuration';
import { createDatabaseClient } from '../src/database/client';
import { CatalogAdminAccessService } from '../src/catalog/admin-access.service';
import { ApiException } from '../src/common/http-errors';
import { SkillUpgradeService } from '../src/operations/skill-upgrade.service';
import { assertLocalTarget } from './local-database';

export async function runSkillUpgradeCommand(arguments_: string[]) {
  const args = arguments_[0] === '--' ? arguments_.slice(1) : arguments_;
  const { values, positionals } = parseArgs({ args, strict: true, allowPositionals: true,
    options: { actor: { type: 'string' }, file: { type: 'string' }, out: { type: 'string' }, domain: { type: 'string' } } });
  const action = positionals[0];
  if (positionals.length !== 1 || !['inventory', 'preview', 'apply'].includes(action ?? '') ||
    (action === 'inventory' && values.file) || (action !== 'inventory' && (!values.file || values.domain)))
    throw new ApiException('VALIDATION_ERROR', '请选择 inventory/preview/apply，预演和执行需要明确的 JSON 文件', 400);
  const target = assertLocalTarget(process.env), configuration = loadConfiguration(process.env);
  let input: unknown;
  if (values.file) {
    try {
      const info = await lstat(values.file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 8 * 1024 * 1024) throw Error('Invalid input');
      input = JSON.parse(await readFile(values.file, 'utf8'));
    } catch { throw new ApiException('VALIDATION_ERROR', '需要不超过 8 MiB 的普通 JSON 文件', 400); }
  }
  let output: FileHandle | undefined, written = false;
  let owner: ReturnType<typeof createDatabaseClient> | undefined;
  let context: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;
  try {
    // Reserve a new private destination before starting any mutation. Never overwrite a prior receipt.
    if (values.out) {
      try { output = await open(values.out, 'wx', 0o600); }
      catch { throw new ApiException('CONFLICT', '输出文件已存在或不能创建，请选择新的文件', 409); }
    }
    owner = createDatabaseClient({ ...configuration, databaseUrl: target.migration.toString() });
    context = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const access = await context.get(CatalogAdminAccessService).authorizeLocalOwner(owner.client, values.actor);
    const service = context.get(SkillUpgradeService);
    const result = action === 'inventory' ? await service.inventory(access, values.domain ? { domain: values.domain } : {})
      : action === 'preview' ? await service.preview(access, input) : await service.apply(access, input);
    if (output) { await output.writeFile(JSON.stringify(result, null, 2) + '\n'); written = true; }
    return { result, outputWritten: written };
  } finally {
    try { await context?.close(); } finally {
      try { await owner?.close(); } finally {
        if (output) { await output.close(); if (!written && values.out) await rm(values.out, { force: true }); }
      }
    }
  }
}
