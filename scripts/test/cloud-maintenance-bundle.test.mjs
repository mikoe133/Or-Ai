import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('the root maintenance command previews only an explicit private environment without inheriting runtime credentials',async()=>{
  assert.ok(JSON.parse(await readFile(join(root,'package.json'),'utf8')).scripts['db:cloud'],'missing explicit maintenance command');
  const directory=await mkdtemp(join(tmpdir(),'orai-maintenance-entry-'));
  try{
    const ca=Buffer.from('-----BEGIN CERTIFICATE-----\nOFFLINE_PREVIEW_ONLY\n-----END CERTIFICATE-----\n'),caFile=join(directory,'ca.pem'),input=join(directory,'maintenance.env'),output=join(directory,'plan.json');
    await writeFile(caFile,ca);
    const ref='a'.repeat(20),host='aws-0-unit.pooler.supabase.com';
    const fields={APP_ENV:'production',NODE_ENV:'production',DATABASE_SSL_MODE:'verify-full',CLOUD_DATABASE_PROJECT_REF:ref,CLOUD_DATABASE_EXPECTED_HOST:host,CLOUD_DATABASE_NAME:'postgres',
      CLOUD_DATABASE_CA_FILE:caFile,CLOUD_DATABASE_CA_SHA256:createHash('sha256').update(ca).digest('hex'),
      CLOUD_DATABASE_BOOTSTRAP_URL:`postgresql://postgres.${ref}:synthetic-bootstrap-only@${host}:5432/postgres?schema=orai`,
      MIGRATION_DATABASE_URL:`postgresql://orai_owner.${ref}:synthetic-migration-only@${host}:5432/postgres?schema=orai`,
      DATABASE_URL:`postgresql://orai_app.${ref}:synthetic-runtime-only@${host}:5432/postgres?schema=orai`};
    await writeFile(input,Object.entries(fields).map(([key,value])=>key+'='+value).join('\n'),{mode:0o600});
    const result=execFileSync('pnpm',['run','db:cloud','preview','--env-file',input,'--out',output],{cwd:root,env:{PATH:process.env.PATH,DATABASE_URL:'PRIVATE_INHERITED_VALUE',APP_ENV:'development'},encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']});
    assert.match(result,/"ok":true/);assert.equal((await stat(output)).mode&0o777,0o600);
    const plan=JSON.parse(await readFile(output,'utf8'));assert.equal(plan.migrations.length,29);assert.equal(plan.target.database,'postgres');
    for(const value of ['PRIVATE_INHERITED_VALUE','synthetic-bootstrap-only','synthetic-migration-only','synthetic-runtime-only'])assert.equal(JSON.stringify(plan).includes(value),false);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('maintenance has a separate nonroot Linux image target and the API keeps its normal runtime entry',async()=>{
  const dockerfile=await readFile(join(root,'apps/api/Dockerfile'),'utf8');
  assert.match(dockerfile,/AS maintenance\b/);
  const maintenance=dockerfile.split(/AS maintenance\b/)[1].split(/FROM .* AS runtime\b/)[0];
  assert.match(maintenance,/USER node/);assert.match(maintenance,/cloud-database-cli\.js/);assert.match(maintenance,/\.tools-build/);
  const runtime=dockerfile.split(/AS runtime\b/)[1];assert.match(runtime,/CMD \["node", "dist\/main.js"\]/);assert.doesNotMatch(runtime,/cloud-database-cli/);
});
