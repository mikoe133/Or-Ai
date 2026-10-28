import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,stat,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {createCloudDatabasePlan,parseCloudDatabaseTarget,applyCloudDatabasePlan,runCloudDatabaseCommand} from '../scripts/cloud-database';
import {cloudDatabaseFixture} from './cloud-database-fixture';
import {assertLocalTarget} from '../scripts/local-database';
let fixture:Awaited<ReturnType<typeof cloudDatabaseFixture>>;
before(async()=>{fixture=await cloudDatabaseFixture();});
after(async()=>{await fixture?.cleanup();});

test('a non-superuser database owner with CREATEROLE can bootstrap without assuming provider superuser privileges',async()=>{
  const isolated=await cloudDatabaseFixture(true);let connections:Awaited<ReturnType<typeof isolated.connections>>|undefined;
  try{
    const {env}=await isolated.newDatabase();connections=await isolated.connections(parseCloudDatabaseTarget(env));
    assert.equal((await connections.bootstrap.query("SELECT rolsuper FROM pg_roles WHERE rolname=current_user")).rows[0].rolsuper,false);
    const result=await applyCloudDatabasePlan(env,await createCloudDatabasePlan(env,'bootstrap'),connections,()=>{});assert.equal(result.migrations,29);
    assert.equal((await connections.runtime.query('SELECT count(*)::int AS count FROM orai.users')).rows[0].count,0);
  }finally{await connections?.close();await isolated.cleanup();}
});

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

test('cloud CLI appends private resumable journals, refuses changed inputs and never reconnects when outputs already exist',async()=>{
  const {env}=await fixture.newDatabase(),input=join(fixture.directory,'cli.env'),planFile=join(fixture.directory,'cli-plan.json'),journal=join(fixture.directory,'cli-journal.jsonl');
  await writeFile(input,Object.entries(env).map(([key,value])=>key+'='+value).join('\n'),{mode:0o600});
  assert.equal((await runCloudDatabaseCommand(['preview','--env-file',input,'--out',planFile])).ok,true);
  const plan=JSON.parse(await readFile(planFile,'utf8'));let opened=0;
  const factory=async(target:ReturnType<typeof parseCloudDatabaseTarget>)=>{opened++;return fixture.connections(target);};
  const args=['apply','--env-file',input,'--file',planFile,'--confirm-target',plan.fingerprint,'--out',journal];
  assert.equal((await runCloudDatabaseCommand(args,factory)).ok,true);assert.equal(opened,1);
  const original=await readFile(journal,'utf8'),events=original.trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(events.map(event=>event.phase),['started','roles_ready','migrations_applied','runtime_verified','completed']);
  assert.equal(new Set(events.map(event=>event.requestId)).size,1);assert.equal((await stat(journal)).mode&0o777,0o600);
  assert.equal((await runCloudDatabaseCommand(args,factory)).ok,false);assert.equal(opened,1);assert.equal(await readFile(journal,'utf8'),original);
  await writeFile(planFile,JSON.stringify({...plan,fingerprint:'0'.repeat(64)}));
  assert.equal((await runCloudDatabaseCommand([...args.slice(0,-1),join(fixture.directory,'changed.jsonl')],factory)).ok,false);assert.equal(opened,1);
  await chmod(input,0o644);assert.equal((await runCloudDatabaseCommand(args,factory)).ok,false);assert.equal(opened,1);
});

test('provider connection and cleanup failures are sanitized in CLI results and durable journals',async()=>{
  const {env}=await fixture.newDatabase(),input=join(fixture.directory,'failure.env'),file=join(fixture.directory,'failure-plan.json');
  await writeFile(input,Object.entries(env).map(([key,value])=>key+'='+value).join('\n'),{mode:0o600});
  await runCloudDatabaseCommand(['preview','--env-file',input,'--out',file]);const plan=JSON.parse(await readFile(file,'utf8'));
  const args=['apply','--env-file',input,'--file',file,'--confirm-target',plan.fingerprint,'--out'];
  const journal=join(fixture.directory,'failed.jsonl');
  const failed=await runCloudDatabaseCommand([...args,journal],()=>{throw Error('PRIVATE_PROVIDER_CREDENTIAL');});
  assert.equal(failed.ok,false);assert.equal(JSON.stringify(failed).includes('PRIVATE_PROVIDER_CREDENTIAL'),false);
  const events=(await readFile(journal,'utf8')).trim().split('\n').map(line=>JSON.parse(line));assert.deepEqual(events.map(event=>event.phase),['started','failed']);
  const cleanup=await runCloudDatabaseCommand([...args,join(fixture.directory,'cleanup.jsonl')],async(target)=>{
    const actual=await fixture.connections(target);return {...actual,async close(){await actual.close();throw Error('PRIVATE_CLEANUP_CREDENTIAL');}};
  });
  assert.deepEqual(cleanup,{ok:false,error:'CLOUD_MAINTENANCE_CLEANUP_FAILED'});
});

test('a stop after official migrations resumes grants without changing the applied migration ledger',async()=>{
  const {env}=await fixture.newDatabase(),connections=await fixture.connections(parseCloudDatabaseTarget(env)),plan=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await assert.rejects(applyCloudDatabasePlan(env,plan,connections,phase=>{if(phase==='migrations_applied')throw Error('Synthetic process stop');}));
    const before=(await connections.bootstrap.query('SELECT * FROM orai._prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(before.length,29);assert.equal((await connections.owner.query('SELECT count(*)::int AS count FROM orai.environment_marker')).rows[0].count,0);
    const result=await applyCloudDatabasePlan(env,plan,connections,()=>{});assert.equal(result.environment,'PRODUCTION');
    assert.deepEqual((await connections.bootstrap.query('SELECT * FROM orai._prisma_migrations ORDER BY migration_name')).rows,before);
  }finally{await connections.close();}
});

test('an actual SQL failure in the official migration engine retains its ledger and requires review before any retry',async()=>{
  const {env}=await fixture.newDatabase(),connections=await fixture.connections(parseCloudDatabaseTarget(env)),plan=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await connections.bootstrap.query("CREATE FUNCTION public.synthetic_migration_failure() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_DDL_FAILURE'; END $$");
    await connections.bootstrap.query("CREATE EVENT TRIGGER synthetic_failure ON ddl_command_start WHEN TAG IN ('CREATE TYPE') EXECUTE FUNCTION public.synthetic_migration_failure()");
    await assert.rejects(applyCloudDatabasePlan(env,plan,connections,()=>{}),{code:'MIGRATION_EXECUTION_FAILED'});
    await connections.bootstrap.query('DROP EVENT TRIGGER synthetic_failure');
    const before=(await connections.bootstrap.query('SELECT * FROM orai._prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(before.length,1);assert.equal(before[0].finished_at,null);
    await assert.rejects(applyCloudDatabasePlan(env,plan,connections,()=>{}),{code:'MIGRATION_HISTORY_REQUIRES_REVIEW'});
    assert.deepEqual((await connections.bootstrap.query('SELECT * FROM orai._prisma_migrations ORDER BY migration_name')).rows,before);
    assert.equal((await connections.bootstrap.query("SELECT to_regclass('orai.users') AS relation")).rows[0].relation,null);
  }finally{await connections.close();}
});

test('untracked views, sequences and functions are retained and refused even on an otherwise initialized target',async()=>{
  const {env}=await fixture.newDatabase(),connections=await fixture.connections(parseCloudDatabaseTarget(env)),plan=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await applyCloudDatabasePlan(env,plan,connections,()=>{});
    for(const [create,drop,exists] of [
      ['CREATE VIEW orai.untracked_view AS SELECT 9 AS id','DROP VIEW orai.untracked_view',"SELECT to_regclass('orai.untracked_view') IS NOT NULL AS found"],
      ['CREATE SEQUENCE orai.untracked_sequence','DROP SEQUENCE orai.untracked_sequence',"SELECT to_regclass('orai.untracked_sequence') IS NOT NULL AS found"],
      ["CREATE FUNCTION orai.untracked_function() RETURNS int LANGUAGE sql AS $$ SELECT 9 $$",'DROP FUNCTION orai.untracked_function()',"SELECT to_regprocedure('orai.untracked_function()') IS NOT NULL AS found"],
    ]){
      await connections.owner.query(create!);
      try{await assert.rejects(applyCloudDatabasePlan(env,plan,connections,()=>{}),{code:'UNTRACKED_SCHEMA_OBJECTS_REJECTED'});assert.equal((await connections.owner.query(exists!)).rows[0].found,true);}
      finally{await connections.owner.query(drop!);}
    }
  }finally{await connections.close();}
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
  const {database,env}=await fixture.newDatabase(),target=parseCloudDatabaseTarget(env),connections=await fixture.connections(target);
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
  const {env}=await fixture.newDatabase(),connections=await fixture.connections(parseCloudDatabaseTarget(env)),plan=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await assert.rejects(applyCloudDatabasePlan(env,plan,{...connections,migrate:async()=>{throw Error('PRIVATE_PROVIDER_FAILURE');}},()=>{}),error=>!String(error).includes('PRIVATE_PROVIDER_FAILURE'));
    assert.equal((await connections.bootstrap.query("SELECT pg_get_userbyid(nspowner) AS name FROM pg_namespace WHERE nspname='orai'")).rows[0].name,'orai_owner');
    const result=await applyCloudDatabasePlan(env,plan,connections,()=>{});assert.equal(result.environment,'PRODUCTION');
    assert.equal((await connections.runtime.query('SELECT count(*)::int AS count FROM orai.users')).rows[0].count,0);
  }finally{await connections.close();}
});
test('an explicitly reviewed migrate plan can restore precise runtime grants without changing immutable migration history',async()=>{
  const {env}=await fixture.newDatabase(),connections=await fixture.connections(parseCloudDatabaseTarget(env)),bootstrap=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await applyCloudDatabasePlan(env,bootstrap,connections,()=>{});
    const before=(await connections.bootstrap.query('SELECT * FROM orai._prisma_migrations ORDER BY migration_name')).rows;
    await connections.owner.query('REVOKE SELECT ON orai.products FROM orai_app');
    await assert.rejects(applyCloudDatabasePlan(env,bootstrap,connections,()=>{}),{code:'RUNTIME_GRANTS_REJECTED'});
    const migrate=await createCloudDatabasePlan(env,'migrate');assert.notEqual(migrate.fingerprint,bootstrap.fingerprint);
    await applyCloudDatabasePlan(env,migrate,connections,()=>{});
    assert.equal((await connections.runtime.query('SELECT count(*)::int AS count FROM orai.products')).rows[0].count,0);
    await assert.rejects(connections.runtime.query('SELECT * FROM orai._prisma_migrations'),{code:'42501'});
    assert.deepEqual((await connections.bootstrap.query('SELECT * FROM orai._prisma_migrations ORDER BY migration_name')).rows,before);
  }finally{await connections.close();}
});
test('unmarked business data, a development marker, changed source digests and elevated runtime roles are refused and retained',async()=>{
  const {env}=await fixture.newDatabase(),connections=await fixture.connections(parseCloudDatabaseTarget(env)),plan=await createCloudDatabasePlan(env,'bootstrap');
  try{
    await assert.rejects(applyCloudDatabasePlan(env,plan,{...connections,migrate:async()=>{throw Error('Synthetic interruption');}},()=>{}));
    await connections.owner.query('CREATE TABLE orai.untracked_data (id int)');
    await connections.owner.query('INSERT INTO orai.untracked_data VALUES (9)');
    await assert.rejects(applyCloudDatabasePlan(env,plan,connections,()=>{}));assert.equal((await connections.owner.query('SELECT id FROM orai.untracked_data')).rows[0].id,9);
    const other=await fixture.newDatabase(),next=await fixture.connections(parseCloudDatabaseTarget(other.env));
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
