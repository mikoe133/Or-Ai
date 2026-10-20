import 'reflect-metadata';
import { Body, Controller, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString, Length } from 'class-validator';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { APP_CONFIG, loadConfiguration } from '../src/config/configuration';

class ProbeInput {
  @IsString()
  @Length(1, 20)
  label!: string;
}

// Validation fixture exists only in test builds, never in the production API.
@Controller('_test')
class ProbeController {
  @Post('input')
  input(@Body() input: ProbeInput): { label: string } { return { label: input.label }; }

  @Post('failure')
  failure(): never { throw new Error('PRIVATE_TEST_SENTINEL'); }
}

let app: INestApplication;
let url: string;
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule], controllers: [ProbeController] }).compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  url = await app.getUrl();
});
after(async () => { await app?.close(); });

test('liveness returns a correlated id without connection details', async () => {
  const response = await fetch(`${url}/health/live`, { headers: { 'x-request-id': 'foundation-live' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), 'foundation-live');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok', requestId: 'foundation-live' });
});

test('readiness verifies an authenticated query against real PostgreSQL', async () => {
  const response = await fetch(`${url}/health/ready`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).checks.database, 'up');
});

test('wrong database credentials fail readiness but leave liveness working', async () => {
  const original = loadConfiguration();
  const wrong = new URL(original.databaseUrl);
  wrong.password = 'wrong-local-test-password';
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG).useValue({ ...original, databaseUrl: wrong.toString() }).compile();
  const unhealthy = module.createNestApplication({ logger: false });
  configureApp(unhealthy);
  try {
    await unhealthy.listen(0, '127.0.0.1');
    const base = await unhealthy.getUrl();
    const response = await fetch(`${base}/health/ready`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.checks.database, 'down');
    assert.equal(JSON.stringify(body).includes(wrong.password), false);
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
  } finally { await unhealthy.close(); }
});

test('global validation rejects extra fields and wrong types with stable errors', async () => {
  for (const input of [{ label: 12 }, { label: 'valid', injected: true }]) {
    const response = await fetch(`${url}/api/_test/input`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
  }
  const response = await fetch(`${url}/api/_test/input`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'valid' }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { label: 'valid' });
});

test('unknown routes use the public error envelope and unsafe ids are replaced', async () => {
  const response = await fetch(`${url}/api/not-found`, { headers: { 'x-request-id': '<unsafe>' } });
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error.code, 'NOT_FOUND');
  assert.match(body.error.requestId, /^[0-9a-f-]{36}$/);
});

test('malformed JSON and unexpected server errors retain request context without leaks', async () => {
  const malformed = await fetch(`${url}/api/_test/input`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not-json',
  });
  assert.equal(malformed.status, 400);
  const invalid = await malformed.json();
  assert.equal(invalid.error.code, 'INVALID_INPUT');
  assert.equal(invalid.error.requestId, malformed.headers.get('x-request-id'));
  const failure = await fetch(`${url}/api/_test/failure`, { method: 'POST' });
  assert.equal(failure.status, 500);
  const body = await failure.json();
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(body.error.requestId, failure.headers.get('x-request-id'));
  assert.equal(JSON.stringify(body).includes('PRIVATE_TEST_SENTINEL'), false);
});

test('invalid boot configuration fails without exposing input secrets', () => {
  const base = { DATABASE_URL: 'postgresql://user:secret@127.0.0.1/test', APP_ENV: 'test' };
  assert.throws(() => loadConfiguration({ ...base, API_PORT: 'bad' }), /API_PORT/);
  assert.equal(loadConfiguration(base).host, '127.0.0.1');
  assert.equal(loadConfiguration({ ...base, API_HOST: '0.0.0.0' }).host, '0.0.0.0');
  assert.throws(() => loadConfiguration({ ...base, API_HOST: 'invalid' }), /API_HOST/);
  assert.throws(() => loadConfiguration({ ...base, DATABASE_URL: 'invalid-secret' }), /^Error: Invalid configuration: DATABASE_URL$/);
  assert.throws(() => loadConfiguration({ ...base, APP_ENV: 'production', DATABASE_SSL_MODE: 'disable' }), /DATABASE_SSL_MODE/);
});
