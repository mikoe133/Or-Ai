import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createCloudDatabasePlan,parseCloudDatabaseTarget,applyCloudDatabasePlan,runCloudDatabaseCommand} from '../scripts/cloud-database';
import {cloudDatabaseFixture} from './cloud-database-fixture';
import {assertLocalTarget} from '../scripts/local-database';
let fixture:Awaited<ReturnType<typeof cloudDatabaseFixture>>;
before(async()=>{fixture=await cloudDatabaseFixture();});
after(async()=>{await fixture?.cleanup();});

test('cloud maintenance preview pins project, TLS CA and all immutable migrations without making a database connection',async()=>{
  const env=fixture.envFor('postgres'),plan=await createCloudDatabasePlan(env,'bootstrap');
  assert.equal(plan.schemaVersion,1);assert.equal(plan.migrations.length,29);assert.equal(plan.target.database,'postgres');
  for(const value of [new URL(env.DATABASE_URL).password,new URL(env.MIGRATION_DATABASE_URL).password,new URL(env.CLOUD_DATABASE_BOOTSTRAP_URL).password])
    assert.equal(JSON.stringify(plan).includes(value),false);
  const input=join(fixture.directory,'maintenance.env'),output=join(fixture.directory,'preview.json');
  await writeFile(input,Object.entries(env).map(([key,value])=>key+'='+value).join('\n'),{mode:0o600});
  let connections=0;
  const result=await runCloudDatabaseCommand(['preview','--env-file',input,'--out',output],()=>{connections++;throw Error('Unexpected provider connection');});
  assert.equal(result.ok,true);assert.equal(connections,0);assert.equal((await stat(output)).mode&0o777,0o600);
  assert.deepEqual(JSON.parse(await readFile(output,'utf8')),plan);
  assert.equal((await runCloudDatabaseCommand(['apply','--env-file',input,'--file',output,'--out',join(fixture.directory,'not-applied.jsonl')],()=>{connections++;throw Error();})).ok,false);
  assert.equal(connections,0);
});
test('cloud target selection refuses loopback, mismatched project/roles, insecure transport and shared passwords without weakening local guards',async()=>{
  const source=fixture.envFor('postgres');
  for(const change of [{DATABASE_SSL_MODE:'disable'},{APP_ENV:'development'},
    {DATABASE_URL:source.CLOUD_DATABASE_BOOTSTRAP_URL},{MIGRATION_DATABASE_URL:source.DATABASE_URL},
    {DATABASE_URL:source.DATABASE_URL.replace('aws-0-unit.pooler.supabase.com','127.0.0.1')},
    {DATABASE_URL:source.DATABASE_URL.replace(':5432/',':6543/')},
    {DATABASE_URL:source.DATABASE_URL+'&host=PRIVATE_SENTINEL'},
    {CLOUD_DATABASE_CA_SHA256:'0'.repeat(64)}])
    await assert.rejects(createCloudDatabasePlan({...source,...change},'bootstrap'),error=>!String(error).includes('PRIVATE_SENTINEL'));
  assert.throws(()=>assertLocalTarget(source));assert.equal(parseCloudDatabaseTarget(source).runtimeRole,'orai_app');
});
test('real TLS initialization runs the original Prisma migrations, restricts runtime permissions and preserves provider schemas',async()=>{
  const {database,env}=await fixture.newDatabase(),target=parseCloudDatabaseTarget(env),connections=fixture.connections(target);
  try{
    await connections.bootstrap.query('CREATE TABLE public.provider_sentinel (id int PRIMARY KEY)');await connections.bootstrap.query('INSERT INTO public.provider_sentinel VALUES (7)');
    const plan=await createCloudDatabasePlan(env,'bootstrap'),events:string[]=[];
    const result=await applyCloudDatabasePlan(env,plan,connections,(phase:string)=>{events.push(phase);});
    assert.equal(result.migrations,29);assert.equal(result.environment,'PRODUCTION');assert.equal(result.seeded,false);assert.equal(result.administratorCreated,false);
    assert.equal((await connections.bootstrap.query('SELECT id FROM public.provider_sentinel')).rows[0].id,7);
    assert.equal((await connections.runtime.query('SELECT current_user AS name')).rows[0].name,'orai_app');
    assert.equal((await connections.runtime.query('SELECT environment,database_name FROM orai.environment_marker WHERE id=1')).rows[0].database_name,database);
    for(const query of ['SELECT * FROM orai._prisma_migrations',"UPDATE orai.environment_marker SET environment='DEVELOPMENT' WHERE id=1",'CREATE TABLE orai.forbidden_probe(id int)'])
      await assert.rejects(connections.runtime.query(query),{code:'42501'});
    const permissions=(await connections.bootstrap.query("SELECT has_table_privilege('orai_app','orai.admin_audit_logs','UPDATE') AS audit,has_table_privilege('orai_app','orai.products','SELECT') AS read,has_schema_privilege('orai_app','orai','CREATE') AS ddl")).rows[0];
    assert.deepEqual(permissions,{audit:false,read:true,ddl:false});
    const before=(await connections.bootstrap.query('SELECT migration_name,checksum,finished_at FROM orai._prisma_migrations ORDER BY migration_name')).rows;
    const retry=await applyCloudDatabasePlan(env,plan,connections,()=>{});assert.equal(retry.alreadyInitialized,true);
    assert.deepEqual((await connections.bootstrap.query('SELECT migration_name,checksum,finished_at FROM orai._prisma_migrations ORDER BY migration_name')).rows,before);
    assert.ok(events.includes('migrations_applied'));assert.ok(events.includes('runtime_verified'));
  }finally{await connections.close();}
});
test('an interrupted initial migration preserves roles/schema and an exact retry can finish without seeding or resetting passwords',async()=>{
  const {env}=await fixture.newDatabase(),connections=fixture.connections(parseCloudDatabaseTarget(env)),plan=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await assert.rejects(applyCloudDatabasePlan(env,plan,{...connections,migrate:async()=>{throw Error('PRIVATE_PROVIDER_FAILURE');}},()=>{}),error=>!String(error).includes('PRIVATE_PROVIDER_FAILURE'));
    assert.equal((await connections.bootstrap.query("SELECT pg_get_userbyid(nspowner) AS name FROM pg_namespace WHERE nspname='orai'")).rows[0].name,'orai_owner');
    const result=await applyCloudDatabasePlan(env,plan,connections,()=>{});assert.equal(result.environment,'PRODUCTION');
    assert.equal((await connections.runtime.query('SELECT count(*)::int AS count FROM orai.users')).rows[0].count,0);
  }finally{await connections.close();}
});
test('unmarked business data, a development marker, changed source digests and elevated runtime roles are refused and retained',async()=>{
  const {env}=await fixture.newDatabase(),connections=fixture.connections(parseCloudDatabaseTarget(env)),plan=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await connections.bootstrap.query('CREATE SCHEMA orai AUTHORIZATION orai_owner');await connections.owner.query('CREATE TABLE orai.untracked_data (id int)');
    await connections.owner.query('INSERT INTO orai.untracked_data VALUES (9)');
    await assert.rejects(applyCloudDatabasePlan(env,plan,connections,()=>{}));assert.equal((await connections.owner.query('SELECT id FROM orai.untracked_data')).rows[0].id,9);
    const other=await fixture.newDatabase(),next=fixture.connections(parseCloudDatabaseTarget(other.env));
    try{await applyCloudDatabasePlan(other.env,await createCloudDatabasePlan(other.env,'bootstrap'),next,()=>{});
      await next.owner.query("UPDATE orai.environment_marker SET environment='DEVELOPMENT' WHERE id=1");
      await assert.rejects(applyCloudDatabasePlan(other.env,await createCloudDatabasePlan(other.env,'bootstrap'),next,()=>{}));
      assert.equal((await next.owner.query('SELECT environment FROM orai.environment_marker')).rows[0].environment,'DEVELOPMENT');
    }finally{await next.close();}
    const changed={...plan,fingerprint:'0'.repeat(64)};await assert.rejects(applyCloudDatabasePlan(env,changed,connections,()=>{}));
    await connections.bootstrap.query('ALTER ROLE orai_app CREATEDB');
    try{await assert.rejects(applyCloudDatabasePlan(env,plan,connections,()=>{}));assert.equal((await connections.bootstrap.query("SELECT rolcreatedb FROM pg_roles WHERE rolname='orai_app'")).rows[0].rolcreatedb,true);}
    finally{await connections.bootstrap.query('ALTER ROLE orai_app NOCREATEDB');}
  }finally{await connections.close();}
});
