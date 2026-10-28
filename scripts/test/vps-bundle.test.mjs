import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {splitVpsInventory,runVpsSplit} from '../vps-env.mjs';
const fixture=()=>({NODE_ENV:'production',APP_ENV:'production',API_HOST:'0.0.0.0',API_PORT:'4100',APP_PUBLIC_ORIGIN:'https://store.unit.test',
  DATABASE_URL:'postgresql://orai_app.unit:runtime%24pass@unit.pooler.supabase.com:5432/postgres?schema=orai',
  MIGRATION_DATABASE_URL:'postgresql://orai_owner.unit:migration-pass@unit.pooler.supabase.com:5432/postgres?schema=orai',DATABASE_SSL_MODE:'verify-full',DATABASE_POOL_MAX:'5',
  CSRF_SIGNING_KEY:Buffer.alloc(32,1).toString('base64url'),AUTH_SESSION_ENCRYPTION_KEY:Buffer.alloc(32,2).toString('base64url'),
  SUPABASE_URL:'https://auth.unit.test',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'p'.repeat(24),
  VITE_APP_PUBLIC_ORIGIN:'https://store.unit.test',VITE_SUPABASE_URL:'https://auth.unit.test',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'p'.repeat(24),
  ASSET_STORAGE_DRIVER:'r2',R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'orai-private',R2_ACCESS_KEY_ID:'b'.repeat(32),R2_SECRET_ACCESS_KEY:'c'.repeat(64),
  UPLOAD_INGRESS_BODY_BYTES:'90000000',UPLOAD_REQUEST_ENVELOPE_BYTES:'0',ASSET_UPLOAD_TIMEOUT_MS:'360000'});
test('VPS inventory separates exact public build inputs from runtime credentials and never exports the migration identity',()=>{
  const source=fixture(),split=splitVpsInventory(source);
  assert.deepEqual(Object.keys(split.web).sort(),['VITE_APP_PUBLIC_ORIGIN','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_URL']);
  assert.equal(split.api.DATABASE_URL,source.DATABASE_URL);assert.equal(split.api.R2_SECRET_ACCESS_KEY,source.R2_SECRET_ACCESS_KEY);
  assert.equal('MIGRATION_DATABASE_URL'in split.api,false);assert.equal(Object.keys(split.api).some(key=>key.startsWith('VITE_')),false);
  assert.equal(JSON.stringify(split.web).includes(source.R2_SECRET_ACCESS_KEY),false);
  assert.throws(()=>splitVpsInventory({...source,VITE_UNKNOWN_SECRET:'PRIVATE_SENTINEL'}),error=>!String(error).includes('PRIVATE_SENTINEL'));
});
test('VPS split outputs are private new files and failure to reserve both destinations preserves all existing evidence',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'orai-vps-split-'));
  try{const input=join(directory,'inventory.env'),api=join(directory,'api.env'),web=join(directory,'web.env');
    await writeFile(input,Object.entries(fixture()).map(([k,v])=>k+'='+v).join('\n'),{mode:0o600});
    await writeFile(web,'existing evidence',{mode:0o600});
    assert.equal((await runVpsSplit(['--env-file',input,'--api-out',api,'--web-out',web])).ok,false);
    assert.equal(await readFile(web,'utf8'),'existing evidence');await assert.rejects(stat(api));
    await rm(web);assert.equal((await runVpsSplit(['--env-file',input,'--api-out',api,'--web-out',web])).ok,true);
    assert.equal((await stat(api)).mode&0o777,0o600);assert.equal((await stat(web)).mode&0o777,0o600);
    assert.equal((await readFile(api,'utf8')).includes('MIGRATION_DATABASE_URL'),false);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('production Compose isolates owner credentials and host exposure while bounding resources and temporary disk',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'orai-vps-compose-')),root=fileURLToPath(new URL('../../',import.meta.url));
  const project='orai-vps-proof-'+randomUUID().slice(0,8);let composition,environment;
  try{const file=join(directory,'api.env');await writeFile(file,'DATABASE_URL=postgresql://runtime:literal$pass@unit.test/db\n',{mode:0o600});
    const env={...process.env,ORAI_API_IMAGE:'orai-api:synthetic',ORAI_WEB_IMAGE:'orai-web:synthetic',ORAI_API_ENV_FILE:file,
      ORAI_NGINX_CONFIG_FILE:join(directory,'nginx.conf'),ORAI_TLS_DIRECTORY:join(directory,'tls'),ORAI_DB_CA_FILE:join(directory,'ca.pem')};
    const result=JSON.parse(execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),'compose','-f',join(root,'compose.production.yml'),'config','--format','json'],{env,encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}));
    assert.equal(result.services.api.ports,undefined);
    assert.equal(result.services.api.environment.MIGRATION_DATABASE_URL,undefined);
    for(const name of ['api','web']){assert.equal(result.services[name].read_only,true);assert.ok(result.services[name].mem_limit);assert.ok(result.services[name].cpus);assert.ok(result.services[name].pids_limit);assert.deepEqual(result.services[name].cap_drop,['ALL']);}
    assert.equal(result.services.web.user,'101:101');assert.equal(result.services.web.ports.length,2);
    assert.ok(result.services.api.tmpfs.some(value=>value.includes('size=')));assert.equal(result.services.api.environment.TRUST_PROXY_CIDRS,'172.30.84.2/32');
    // Compose's round-trip config serializer escapes dollars. Verify the actual
    // container environment instead of treating that presentation as a mutation.
    const override=join(directory,'proof.yml');
    const probe='const crypto=require("node:crypto");console.log(JSON.stringify({sha256:crypto.createHash("sha256").update(process.env.DATABASE_URL).digest("hex"),migrationPresent:!!process.env.MIGRATION_DATABASE_URL,frontendFields:Object.keys(process.env).filter(k=>k.startsWith("VITE_")).length}));';
    await writeFile(override,'services:\n  api:\n    image: node:24.21.0-bookworm-slim\n    network_mode: none\n    networks: !reset []\n    volumes: !reset []\n    entrypoint: '+JSON.stringify(['node','-e',probe])+'\n    command: []\n');
    composition=['compose','-p',project,'-f',join(root,'compose.production.yml'),'-f',override];environment=env;
    const output=execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),...composition,'run','--rm','-T','--no-deps','api'],{env,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
    const actual=JSON.parse(output.trim());
    assert.equal(actual.sha256,createHash('sha256').update('postgresql://runtime:literal$pass@unit.test/db').digest('hex'));
    assert.equal(actual.migrationPresent,false);assert.equal(actual.frontendFields,0);
  }finally{
    if(composition)try{execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),...composition,'down','--remove-orphans'],{env:environment,encoding:'utf8',timeout:10000,stdio:'ignore'});}catch{}
    await rm(directory,{recursive:true,force:true});
  }
});
