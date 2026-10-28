import {Pool,type PoolClient} from 'pg';
import {z} from 'zod';
import {createHash,randomUUID} from 'node:crypto';
import {lstat,readFile,readdir,open,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {isAbsolute,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {parseArgs,parseEnv,promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {grantRuntimeAccess} from './runtime-grants';

const execute=promisify(execFile),sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const hex=z.string().regex(/^[a-f0-9]{64}$/),mode=z.enum(['bootstrap','migrate']);
const PlanSchema=z.object({schemaVersion:z.literal(1),mode,target:z.object({projectRef:z.string(),hostname:z.string(),port:z.literal(5432),database:z.string(),migrationRole:z.literal('orai_owner'),runtimeRole:z.literal('orai_app')}).strict(),
  caSha256:hex,migrations:z.array(z.object({name:z.string().regex(/^\d{14}_[a-z0-9_]+$/),checksum:hex}).strict()).min(1).max(200),migrationsDigest:hex,fingerprint:hex}).strict();
export type CloudDatabasePlan=z.infer<typeof PlanSchema>;
export type CloudDatabaseTarget=CloudDatabasePlan['target']&{bootstrapUrl:string;migrationUrl:string;runtimeUrl:string;caFile:string;caSha256:string};
export interface CloudDatabaseConnections{bootstrap:Pool;owner:Pool;runtime:Pool;migrate():Promise<void>;close():Promise<void>}
class CloudDatabaseError extends Error {constructor(readonly code:string){super(code);}}
const refused=(code='CLOUD_CONFIGURATION_INVALID'):never=>{throw new CloudDatabaseError(code);};
const envFields=new Set(['APP_ENV','NODE_ENV','DATABASE_SSL_MODE','CLOUD_DATABASE_PROJECT_REF','CLOUD_DATABASE_EXPECTED_HOST','CLOUD_DATABASE_NAME',
  'CLOUD_DATABASE_CA_FILE','CLOUD_DATABASE_CA_SHA256','CLOUD_DATABASE_BOOTSTRAP_URL','MIGRATION_DATABASE_URL','DATABASE_URL']);

/** Explicit maintenance-only input. This never relaxes assertLocalTarget or opens a connection. */
export function parseCloudDatabaseTarget(env:NodeJS.ProcessEnv):CloudDatabaseTarget{
  try{
    if(Object.keys(env).some(key=>!envFields.has(key))||env.APP_ENV!=='production'||env.NODE_ENV!=='production'||env.DATABASE_SSL_MODE!=='verify-full')return refused();
    const projectRef=env.CLOUD_DATABASE_PROJECT_REF!,hostname=env.CLOUD_DATABASE_EXPECTED_HOST!,database=env.CLOUD_DATABASE_NAME!;
    if(!/^[a-z0-9]{20}$/.test(projectRef)||!hostname||hostname!==hostname.toLowerCase()||
      !(/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pooler\.supabase\.com$/.test(hostname)||hostname==='db.'+projectRef+'.supabase.co')||
      !/^[a-z][a-z0-9_]{0,62}$/.test(database)||!isAbsolute(env.CLOUD_DATABASE_CA_FILE??'')||!/^[a-f0-9]{64}$/.test(env.CLOUD_DATABASE_CA_SHA256??''))return refused();
    const urls=[env.CLOUD_DATABASE_BOOTSTRAP_URL,env.MIGRATION_DATABASE_URL,env.DATABASE_URL].map(raw=>new URL(raw!));
    for(const [index,url] of urls.entries()){
      const role=['postgres','orai_owner','orai_app'][index]!,user=hostname.endsWith('.pooler.supabase.com')?role+'.'+projectRef:role;
      if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!==hostname||url.port!=='5432'||url.pathname!=='/'+database||url.hash||
        decodeURIComponent(url.username)!==user||decodeURIComponent(url.password).length<16||url.searchParams.getAll('schema').length!==1||url.searchParams.get('schema')!=='orai'||
        [...url.searchParams.keys()].some(key=>key!=='schema'))return refused();
    }
    if(new Set(urls.map(url=>decodeURIComponent(url.password))).size!==3)return refused();
    return {projectRef,hostname,port:5432,database,migrationRole:'orai_owner',runtimeRole:'orai_app',bootstrapUrl:urls[0]!.toString(),migrationUrl:urls[1]!.toString(),runtimeUrl:urls[2]!.toString(),
      caFile:env.CLOUD_DATABASE_CA_FILE!,caSha256:env.CLOUD_DATABASE_CA_SHA256!};
  }catch{return refused();}
}
async function pinnedCa(target:CloudDatabaseTarget){
  const info=await lstat(target.caFile);if(!info.isFile()||info.isSymbolicLink()||info.size>256*1024)return refused();
  const value=await readFile(target.caFile);if(sha(value)!==target.caSha256||!value.includes(Buffer.from('BEGIN CERTIFICATE'))||value.includes(Buffer.from('PRIVATE KEY')))return refused();
  return value;
}
export async function createCloudDatabasePlan(env:NodeJS.ProcessEnv,action:CloudDatabasePlan['mode']):Promise<CloudDatabasePlan>{
  try{
    const parsedMode=mode.parse(action),target=parseCloudDatabaseTarget(env);await pinnedCa(target);
    const directory=resolve('prisma/migrations'),info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink())return refused();
    const entries=(await readdir(directory,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort();
    if(!entries.length||entries.length>200)return refused();
    const migrations=[];let total=0;
    for(const name of entries){if(!/^\d{14}_[a-z0-9_]+$/.test(name))return refused();
      const path=join(directory,name,'migration.sql'),metadata=await lstat(path);if(!metadata.isFile()||metadata.isSymbolicLink()||metadata.size<1||metadata.size>1024*1024||(total+=metadata.size)>5*1024*1024)return refused();
      migrations.push({name,checksum:sha(await readFile(path))});
    }
    const {projectRef,hostname,port,database,migrationRole,runtimeRole}=target;
    const document={schemaVersion:1 as const,mode:parsedMode,target:{projectRef,hostname,port,database,migrationRole,runtimeRole},caSha256:target.caSha256,migrations,migrationsDigest:sha(JSON.stringify(migrations))};
    return PlanSchema.parse({...document,fingerprint:sha(JSON.stringify(document))});
  }catch(error){if(error instanceof CloudDatabaseError)throw error;return refused();}
}
// Prisma 7's prisma-client generator does not expose DMMF. The reviewed SQL,
// rather than private client metadata, is the authority for managed table names.
async function managedObjects(plan:CloudDatabasePlan){
  const tables=new Set<string>(),functions=new Set<string>();
  for(const migration of plan.migrations){
    const sql=await readFile(resolve('prisma/migrations',migration.name,'migration.sql'),'utf8');
    if(sha(sql)!==migration.checksum)return refused('MAINTENANCE_PLAN_CHANGED');
    for(const match of sql.matchAll(/^CREATE TABLE\s+(?:(?:"orai"|orai)\.)?"?([a-z][a-z0-9_]*)"?\s*\(/gm))tables.add(match[1]!);
    for(const match of sql.matchAll(/^CREATE(?: OR REPLACE)? FUNCTION\s+(?:(?:"orai"|orai)\.)?"?([a-z][a-z0-9_]*)"?\s*\(/gm))functions.add(match[1]!);
  }
  if(!tables.size)return refused('MAINTENANCE_PLAN_CHANGED');
  return {tables,functions};
}
type History={migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null};
async function history(client:PoolClient){
  if(!(await client.query("SELECT to_regclass('orai._prisma_migrations') AS table_id")).rows[0].table_id)return [] as History[];
  return (await client.query<History>('SELECT migration_name,checksum,finished_at,rolled_back_at FROM orai._prisma_migrations ORDER BY migration_name')).rows;
}
function verifyHistory(rows:History[],plan:CloudDatabasePlan){
  if(rows.length>plan.migrations.length||rows.some((row,index)=>!row.finished_at||row.rolled_back_at||row.migration_name!==plan.migrations[index]?.name||row.checksum!==plan.migrations[index]?.checksum))return refused('MIGRATION_HISTORY_REQUIRES_REVIEW');
}
async function roles(client:PoolClient){
  const rows=(await client.query<{rolname:string;rolsuper:boolean;rolcreatedb:boolean;rolcreaterole:boolean;rolbypassrls:boolean;rolinherit:boolean}>(
    "SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,rolinherit FROM pg_roles WHERE rolname IN ('orai_owner','orai_app')")).rows;
  if(rows.some(row=>Object.entries(row).some(([key,value])=>key!=='rolname'&&value)))return refused('ROLE_PRIVILEGES_REJECTED');
  if((await client.query("SELECT 1 FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN ('orai_app','orai_owner')) LIMIT 1")).rowCount)return refused('ROLE_MEMBERSHIPS_REJECTED');
  return rows;
}
async function prepareRoles(client:PoolClient,target:CloudDatabaseTarget){
  const existing=await roles(client);
  await client.query('BEGIN');try{
    for(const [name,raw] of [['orai_owner',target.migrationUrl],['orai_app',target.runtimeUrl]]){
      if(!existing.some(row=>row.rolname===name)){
        const sql=(await client.query("SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L',$1::text,$2::text) AS statement",[name,decodeURIComponent(new URL(raw!).password)])).rows[0].statement;
        await client.query(sql);
      }
      await client.query((await client.query("SELECT format('GRANT CONNECT ON DATABASE %I TO %I',$1::text,$2::text) AS statement",[target.database,name])).rows[0].statement);
      // The immutable first migration checks CREATE on the database even when
      // its schema already exists. Only the separate migration login gets it.
      if(name===target.migrationRole)await client.query((await client.query("SELECT format('GRANT CREATE ON DATABASE %I TO %I',$1::text,$2::text) AS statement",[target.database,name])).rows[0].statement);
    }
    await client.query('CREATE SCHEMA IF NOT EXISTS orai AUTHORIZATION orai_owner');
    await client.query('REVOKE ALL ON SCHEMA orai FROM PUBLIC');await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
}
async function namespace(client:PoolClient,target:CloudDatabaseTarget,plan:CloudDatabasePlan){
  const known=await managedObjects(plan);
  const schema=(await client.query("SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname='orai'")).rows[0];
  if(schema&&schema.owner!==target.migrationRole)return refused('EXISTING_SCHEMA_OWNER_REJECTED');
  const tables=(await client.query<{tablename:string;tableowner:string}>("SELECT tablename,tableowner FROM pg_tables WHERE schemaname='orai' ORDER BY tablename")).rows;
  if(tables.some(table=>table.tableowner!==target.migrationRole||table.tablename!=='_prisma_migrations'&&!known.tables.has(table.tablename)))return refused('UNTRACKED_SCHEMA_OBJECTS_REJECTED');
  // The current immutable migrations create ordinary tables and indexes, with
  // no views, foreign tables or sequences. Never grant access to stray objects.
  if((await client.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='orai' AND c.relkind NOT IN ('r','i') LIMIT 1")).rowCount)return refused('UNTRACKED_SCHEMA_OBJECTS_REJECTED');
  const functions=(await client.query<{name:string;owner:string}>("SELECT p.proname AS name,pg_get_userbyid(p.proowner) AS owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='orai'")).rows;
  if(functions.some(fn=>fn.owner!==target.migrationRole||!known.functions.has(fn.name)))return refused('UNTRACKED_SCHEMA_OBJECTS_REJECTED');
  const markerTable=tables.some(table=>table.tablename==='environment_marker');
  const markers=markerTable?(await client.query('SELECT id,environment,database_name FROM orai.environment_marker')).rows:[];
  if(markers.length>1||markers[0]&&(markers[0].id!==1||markers[0].environment!=='PRODUCTION'||markers[0].database_name!==target.database))return refused('DATABASE_MARKER_REJECTED');
  if(!markers.length){
    const recorded=tables.some(table=>table.tablename==='_prisma_migrations');if(tables.length&&!recorded)return refused('UNTRACKED_SCHEMA_OBJECTS_REJECTED');
    for(const table of tables){if(table.tablename==='_prisma_migrations'||table.tablename==='environment_marker')continue;
      if((await client.query('SELECT 1 FROM orai."'+table.tablename+'" LIMIT 1')).rowCount)return refused('UNMARKED_BUSINESS_DATA_REJECTED');
    }
  }
  return {marker:markers[0],tables};
}
async function verifyRuntime(connections:CloudDatabaseConnections,target:CloudDatabaseTarget){
  const result=(await connections.runtime.query("SELECT current_database() AS database,current_user AS name,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=current_user")).rows[0];
  if(result?.database!==target.database||result?.name!==target.runtimeRole||['rolsuper','rolcreatedb','rolcreaterole','rolbypassrls','rolinherit'].some(key=>result[key]))return refused('RUNTIME_IDENTITY_REJECTED');
  const marker=(await connections.runtime.query('SELECT environment,database_name FROM orai.environment_marker WHERE id=1')).rows[0];
  if(marker?.environment!=='PRODUCTION'||marker.database_name!==target.database)return refused('DATABASE_MARKER_REJECTED');
  const permissions=(await connections.runtime.query("SELECT has_table_privilege(current_user,'orai._prisma_migrations','SELECT') AS migration,has_table_privilege(current_user,'orai.environment_marker','UPDATE') AS marker,has_table_privilege(current_user,'orai.admin_audit_logs','UPDATE') AS audit,has_schema_privilege(current_user,'orai','CREATE') AS ddl,has_database_privilege(current_user,current_database(),'CREATE') AS database_ddl,has_column_privilege(current_user,'orai.users','role','UPDATE') AS role,has_table_privilege(current_user,'orai.products','SELECT') AS catalog")).rows[0];
  if(permissions.migration||permissions.marker||permissions.audit||permissions.ddl||permissions.database_ddl||permissions.role||!permissions.catalog)return refused('RUNTIME_GRANTS_REJECTED');
}
export async function applyCloudDatabasePlan(env:NodeJS.ProcessEnv,input:unknown,connections:CloudDatabaseConnections,
  progress:(phase:string)=>void|Promise<void>){
  let client:PoolClient|undefined,locked=false;
  try{
    const reviewed=PlanSchema.parse(input),expected=await createCloudDatabasePlan(env,reviewed.mode);
    if(JSON.stringify(reviewed)!==JSON.stringify(expected))return refused('MAINTENANCE_PLAN_CHANGED');
    const target=parseCloudDatabaseTarget(env);client=await connections.bootstrap.connect();
    if((await client.query('SELECT current_database() AS name')).rows[0].name!==target.database)return refused('DATABASE_IDENTITY_REJECTED');
    await client.query("SET statement_timeout='30s'");await client.query("SET lock_timeout='5s'");
    await client.query("SELECT pg_advisory_lock(hashtextextended('orai-cloud-maintenance',0))");locked=true;
    await roles(client);const state=await namespace(client,target,reviewed),before=await history(client);verifyHistory(before,reviewed);
    if(state.marker&&before.length===reviewed.migrations.length&&reviewed.mode==='bootstrap'){await verifyRuntime(connections,target);await progress('runtime_verified');
      return {migrations:before.length,environment:'PRODUCTION' as const,seeded:false,administratorCreated:false,alreadyInitialized:true};}
    if(state.marker&&reviewed.mode!=='migrate')return refused('EXISTING_TARGET_NEEDS_MIGRATE_PLAN');
    if(!state.marker&&reviewed.mode!=='bootstrap')return refused('INITIAL_TARGET_NEEDS_BOOTSTRAP_PLAN');
    await prepareRoles(client,target);await progress('roles_ready');
    if((await connections.owner.query('SELECT current_user AS name')).rows[0].name!==target.migrationRole)return refused('MIGRATION_IDENTITY_REJECTED');
    try{await connections.migrate();}catch{return refused('MIGRATION_EXECUTION_FAILED');}
    const applied=await history(client);verifyHistory(applied,reviewed);if(applied.length!==reviewed.migrations.length)return refused('MIGRATION_SET_INCOMPLETE');
    await progress('migrations_applied');
    const owner=await connections.owner.connect();try{
      await owner.query('BEGIN');try{
        await grantRuntimeAccess(owner);
        await owner.query("INSERT INTO orai.environment_marker(id,environment,database_name) VALUES(1,'PRODUCTION',$1) ON CONFLICT(id) DO NOTHING",[target.database]);
        await owner.query('COMMIT');
      }catch(error){await owner.query('ROLLBACK');throw error;}
    }finally{owner.release();}
    await verifyRuntime(connections,target);await progress('runtime_verified');
    return {migrations:applied.length,environment:'PRODUCTION' as const,seeded:false,administratorCreated:false,alreadyInitialized:false};
  }catch(error){if(error instanceof CloudDatabaseError)throw error;throw new CloudDatabaseError('CLOUD_MAINTENANCE_FAILED');}
  finally{if(client){if(locked)await client.query("SELECT pg_advisory_unlock(hashtextextended('orai-cloud-maintenance',0))").catch(()=>undefined);client.release();}}
}
export async function createCloudDatabaseConnections(target:CloudDatabaseTarget):Promise<CloudDatabaseConnections>{
  const ca=await pinnedCa(target),directory=await mkdtemp(join(tmpdir(),'orai-cloud-ca-')),caPath=join(directory,'verified.pem');
  await writeFile(caPath,ca,{flag:'wx',mode:0o600});
  const pool=(connectionString:string)=>new Pool({connectionString,ssl:{ca,rejectUnauthorized:true},max:1,connectionTimeoutMillis:5000,query_timeout:30000});
  const bootstrap=pool(target.bootstrapUrl),owner=pool(target.migrationUrl),runtime=pool(target.runtimeUrl);
  return {bootstrap,owner,runtime,async migrate(){
    const url=new URL(target.migrationUrl);url.searchParams.set('sslmode','require');url.searchParams.set('sslaccept','strict');url.searchParams.set('sslcert',caPath);
    await execute(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{cwd:process.cwd(),env:{PATH:process.env.PATH,NODE_ENV:'production',
      MIGRATION_DATABASE_URL:url.toString(),NODE_EXTRA_CA_CERTS:caPath,PRISMA_HIDE_UPDATE_MESSAGE:'1'},timeout:180000,maxBuffer:2*1024*1024});
  },async close(){await Promise.allSettled([bootstrap.end(),owner.end(),runtime.end()]);await rm(directory,{recursive:true,force:true});}};
}
export async function runCloudDatabaseCommand(args:string[],factory:(target:CloudDatabaseTarget)=>CloudDatabaseConnections|Promise<CloudDatabaseConnections>=createCloudDatabaseConnections){
  let output:Awaited<ReturnType<typeof open>>|undefined,connections:CloudDatabaseConnections|undefined;
  let requestId:string|undefined,fingerprint:string|undefined;
  try{
    const {positionals,values}=parseArgs({args,allowPositionals:true,strict:true,options:{'env-file':{type:'string'},'config-file':{type:'string'},out:{type:'string'},file:{type:'string'},mode:{type:'string'},'confirm-target':{type:'string'}}});
    const sourcePath=values['config-file']??values['env-file'];
    const action=positionals[0];if(positionals.length!==1||!['preview','apply'].includes(action??'')||!sourcePath||!values.out||values['env-file']&&values['config-file']||
      !isAbsolute(sourcePath)||!isAbsolute(values.out)||action==='preview'&&(values.file||values['confirm-target'])||action==='apply'&&(!values.file||!isAbsolute(values.file)||values.mode||!values['confirm-target']))return refused('EXPLICIT_MAINTENANCE_INPUT_REQUIRED');
    const info=await lstat(sourcePath);if(!info.isFile()||info.isSymbolicLink()||info.size>1024*1024||(info.mode&0o077)!==0)return refused('PRIVATE_MAINTENANCE_ENV_REQUIRED');
    const env=parseEnv(await readFile(sourcePath,'utf8'));
    if(action==='preview'){
      const plan=await createCloudDatabasePlan(env,mode.parse(values.mode??'bootstrap'));
      output=await open(values.out,'wx',0o600);await output.writeFile(JSON.stringify(plan,null,2)+'\n');await output.sync();return {ok:true};
    }
    const planInfo=await lstat(values.file!);if(!planInfo.isFile()||planInfo.isSymbolicLink()||planInfo.size>2*1024*1024)return refused('MAINTENANCE_PLAN_CHANGED');
    const plan=PlanSchema.parse(JSON.parse(await readFile(values.file!,'utf8'))),fresh=await createCloudDatabasePlan(env,plan.mode);
    if(JSON.stringify(plan)!==JSON.stringify(fresh)||values['confirm-target']!==plan.fingerprint)return refused('MAINTENANCE_PLAN_CHANGED');
    output=await open(values.out,'wx',0o600);requestId=randomUUID();fingerprint=plan.fingerprint;
    const record=async(phase:string)=>{await output!.writeFile(JSON.stringify({schemaVersion:1,requestId,fingerprint,phase,at:new Date().toISOString()})+'\n');await output!.sync();};
    await record('started');connections=await factory(parseCloudDatabaseTarget(env));
    const result=await applyCloudDatabasePlan(env,plan,connections,record);await record('completed');return {ok:true,result};
  }catch(error){const code=error instanceof CloudDatabaseError?error.code:'MAINTENANCE_INPUT_OR_OPERATION_FAILED';
    if(output&&requestId)await (async()=>{await output!.writeFile(JSON.stringify({schemaVersion:1,requestId,fingerprint,phase:'failed',code,at:new Date().toISOString()})+'\n');await output!.sync();})().catch(()=>undefined);
    return {ok:false,error:code};
  }finally{
    let cleanupFailed=false;
    try{await connections?.close();}catch{cleanupFailed=true;
      if(output&&requestId)await (async()=>{await output!.writeFile(JSON.stringify({schemaVersion:1,requestId,fingerprint,phase:'cleanup_failed',at:new Date().toISOString()})+'\n');await output!.sync();})().catch(()=>undefined);
    }
    try{await output?.close();}catch{cleanupFailed=true;}
    if(cleanupFailed)return {ok:false,error:'CLOUD_MAINTENANCE_CLEANUP_FAILED'};
  }
}
