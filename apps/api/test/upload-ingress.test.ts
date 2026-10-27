import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadConfiguration} from '../src/config/configuration';
const local=()=>({APP_ENV:'test',DATABASE_URL:'postgresql://app:synthetic@127.0.0.1/orai_test'});
const cloud=()=>({APP_ENV:'production',DATABASE_URL:'postgresql://app:synthetic@db.unit.test/postgres',
  DATABASE_SSL_MODE:'verify-full',APP_PUBLIC_ORIGIN:'https://store.unit.test',CSRF_SIGNING_KEY:'s'.repeat(43),ASSET_STORAGE_DRIVER:'r2',
  R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'orai-private',R2_ACCESS_KEY_ID:'b'.repeat(32),R2_SECRET_ACCESS_KEY:'c'.repeat(64),
  UPLOAD_INGRESS_BODY_BYTES:'90000000',UPLOAD_REQUEST_ENVELOPE_BYTES:'0',ASSET_UPLOAD_TIMEOUT_MS:'360000'});
test('runtime byte budgets use explicit body/envelope bytes and preserve smaller media/contract limits',()=>{
  const settings=loadConfiguration({...local(),UPLOAD_INGRESS_BODY_BYTES:'1000',UPLOAD_REQUEST_ENVELOPE_BYTES:'20',ASSET_UPLOAD_TIMEOUT_MS:'360000'}).assets!;
  assert.deepEqual(settings.uploadBudget,{ingressBodyBytes:1000,requestEnvelopeBytes:20,maxFileBytes:980});
  assert.equal(settings.uploadTimeoutMs,360000);assert.equal(settings.maxImageBytes,10485760);
  assert.equal(loadConfiguration(local()).assets!.uploadBudget,undefined);
});
test('incomplete, exhausted and unsafe runtime budgets fail without exposing invalid values',()=>{
  for(const change of [{UPLOAD_INGRESS_BODY_BYTES:'1000'},
    {UPLOAD_INGRESS_BODY_BYTES:'1000',UPLOAD_REQUEST_ENVELOPE_BYTES:'1000'},
    {UPLOAD_INGRESS_BODY_BYTES:'1000',UPLOAD_REQUEST_ENVELOPE_BYTES:'-1'},
    {UPLOAD_INGRESS_BODY_BYTES:'9007199254740992',UPLOAD_REQUEST_ENVELOPE_BYTES:'0'},
    {UPLOAD_INGRESS_BODY_BYTES:'PRIVATE_SENTINEL',UPLOAD_REQUEST_ENVELOPE_BYTES:'0'}])
    assert.throws(()=>loadConfiguration({...local(),...change}),error=>{assert.equal(String(error).includes('PRIVATE_SENTINEL'),false);return true;});
});
test('production R2 needs an explicit ingress budget and keeps migration credentials out of the runtime',()=>{
  assert.equal(loadConfiguration(cloud()).assets!.uploadBudget?.maxFileBytes,90000000);
  assert.throws(()=>loadConfiguration({...cloud(),UPLOAD_INGRESS_BODY_BYTES:undefined,UPLOAD_REQUEST_ENVELOPE_BYTES:undefined}));
  assert.throws(()=>loadConfiguration({...cloud(),MIGRATION_DATABASE_URL:'postgresql://owner:PRIVATE_SENTINEL@db.unit.test/postgres'}),error=>{assert.equal(String(error).includes('PRIVATE_SENTINEL'),false);return true;});
});
