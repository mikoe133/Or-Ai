import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { LocalAssetStorage } from '../src/operations/asset-storage';
import { ApiException } from '../src/common/http-errors';
import { loadConfiguration } from '../src/config/configuration';

const failure = (code: string) => (error: unknown) => error instanceof ApiException && error.code === code;

test('local storage refuses path traversal, overwrite, symlink reads and interrupted streams without leaking partial bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'orai-storage-'));
  const configuration = loadConfiguration({ APP_ENV: 'test', DATABASE_URL: 'postgresql://unused@127.0.0.1/orai_test', ASSET_DIRECTORY: directory });
  const storage = new LocalAssetStorage(configuration), bytes = await readFile('test/fixtures/cover.jpg');
  const expected = { byteSize: bytes.length, checksum: createHash('sha256').update(bytes).digest('hex'), mimeType: 'image/jpeg' };
  const key = randomUUID() + '.blob';
  try {
    await assert.rejects(storage.receive('../outside.blob', Readable.from(bytes), expected), failure('VALIDATION_ERROR'));
    await storage.receive(key, Readable.from(bytes), expected);
    await assert.rejects(storage.receive(key, Readable.from(bytes), expected), failure('SERVICE_UNAVAILABLE'));
    assert.deepEqual(await storage.inspect(key, bytes.length), expected);
    await assert.rejects(storage.inspect(key, bytes.length - 1), failure('VALIDATION_ERROR'));
    const link = randomUUID() + '.blob'; await symlink(join(directory, key), join(directory, link));
    await assert.rejects(storage.read(link), failure('SERVICE_UNAVAILABLE'));
    const partialKey = randomUUID() + '.blob';
    async function* interrupted() { yield bytes.subarray(0, 30); throw new Error('test interruption'); }
    await assert.rejects(storage.receive(partialKey, interrupted(), expected), failure('SERVICE_UNAVAILABLE'));
    assert.equal((await readdir(directory)).includes(partialKey), false);
    await storage.remove(key); await storage.remove(key);
    await assert.rejects(storage.read(key), failure('SERVICE_UNAVAILABLE'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('local storage refuses a symbolic storage directory and any local writes under production or disabled configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'orai-storage-config-'));
  const configuration = loadConfiguration({ APP_ENV: 'test', DATABASE_URL: 'postgresql://unused@127.0.0.1/orai_test', ASSET_DIRECTORY: directory });
  const bytes = await readFile('test/fixtures/cover.webp');
  const expected = { byteSize: bytes.length, checksum: createHash('sha256').update(bytes).digest('hex'), mimeType: 'image/webp' };
  try {
    const link = directory + '-link'; await symlink(directory, link);
    try { await assert.rejects(new LocalAssetStorage({ ...configuration, assets: { ...configuration.assets!, directory: link } }).receive(randomUUID() + '.blob', Readable.from(bytes), expected), failure('SERVICE_UNAVAILABLE')); }
    finally { await rm(link); }
    for (const config of [{ ...configuration, environment: 'production' as const }, { ...configuration, assets: { ...configuration.assets!, driver: 'disabled' as const } }]) {
      await assert.rejects(new LocalAssetStorage(config).receive(randomUUID() + '.blob', Readable.from(bytes), expected), failure('SERVICE_UNAVAILABLE'));
    }
    assert.deepEqual(await readdir(directory), []);
    assert.throws(() => loadConfiguration({ APP_ENV: 'production', DATABASE_URL: 'postgresql://unused@127.0.0.1/orai_test',
      APP_PUBLIC_ORIGIN: 'https://example.test', CSRF_SIGNING_KEY: 'x'.repeat(43), ASSET_STORAGE_DRIVER: 'local' }), /ASSET_STORAGE_DRIVER/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
