// Explicit local Docker proof. No real cloud endpoint, credential or DNS is used.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv[2],'--image');const image=process.argv[3];assert.match(image??'',/^[a-z0-9][a-z0-9/:._@-]+$/);assert.equal(process.argv.length,4);
const docker=args=>execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),...args],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']}).trim();
await mkdir(join(root,'.local'),{recursive:true});const directory=await mkdtemp(join(root,'.local/maintenance-image-'));
const suffix=randomUUID().slice(0,8),database='orai-maint-pg-'+suffix,network='orai-maint-net-'+suffix,fixtureImage='orai-maint-pg-fixture:'+suffix;
const ref='a'.repeat(20),hostname='db.'+ref+'.supabase.co',password='synthetic-bootstrap-'+randomUUID();
const child=String.raw`
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),crypto=require('node:crypto'),cp=require('node:child_process'),{promisify}=require('node:util');
(async()=>{
 const input=JSON.parse(process.argv[1]);assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');assert.equal(process.getuid(),1000);
 await assert.rejects(fs.writeFile('/workspace/forbidden-write','proof'));
 const ca=Buffer.from(input.ca,'base64'),caFile='/tmp/proof-ca.pem',envFile='/tmp/maintenance.env',planFile='/tmp/plan.json';await fs.writeFile(caFile,ca,{mode:384});
 const fields={APP_ENV:'production',NODE_ENV:'production',DATABASE_SSL_MODE:'verify-full',CLOUD_DATABASE_PROJECT_REF:input.ref,CLOUD_DATABASE_EXPECTED_HOST:input.hostname,CLOUD_DATABASE_NAME:'postgres',
 CLOUD_DATABASE_CA_FILE:caFile,CLOUD_DATABASE_CA_SHA256:crypto.createHash('sha256').update(ca).digest('hex'),
 CLOUD_DATABASE_BOOTSTRAP_URL:'postgresql://postgres:'+input.password+'@'+input.hostname+':5432/postgres?schema=orai',
 MIGRATION_DATABASE_URL:'postgresql://orai_owner:synthetic-owner-separated-password@'+input.hostname+':5432/postgres?schema=orai',
 DATABASE_URL:'postgresql://orai_app:synthetic-runtime-separated-password@'+input.hostname+':5432/postgres?schema=orai'};
 await fs.writeFile(envFile,Object.entries(fields).map(([k,v])=>k+'='+v).join('\n'),{mode:384});
 const {Pool}=require('pg'),manager=new Pool({connectionString:fields.CLOUD_DATABASE_BOOTSTRAP_URL,ssl:{ca,rejectUnauthorized:true},max:1});
 try{assert.equal((await manager.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0].rolsuper,false);}finally{await manager.end();}
 const run=async args=>JSON.parse((await promisify(cp.execFile)(process.execPath,['.tools-build/scripts/cloud-database-cli.js',...args],{timeout:45000,maxBuffer:1024*1024})).stdout);
 assert.equal((await run(['preview','--config-file',envFile,'--out',planFile])).ok,true);const plan=JSON.parse(await fs.readFile(planFile,'utf8'));
 const applied=await run(['apply','--config-file',envFile,'--file',planFile,'--confirm-target',plan.fingerprint,'--out','/tmp/receipt.jsonl']);assert.equal(applied.ok,true);assert.equal(applied.result.migrations,29);
 const retry=await run(['apply','--config-file',envFile,'--file',planFile,'--confirm-target',plan.fingerprint,'--out','/tmp/retry.jsonl']);assert.equal(retry.result.alreadyInitialized,true);
 const pool=new Pool({connectionString:fields.DATABASE_URL,ssl:{ca,rejectUnauthorized:true},max:1});
 try{assert.equal((await pool.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0].ssl,true);
  for(const sql of ['SELECT * FROM orai._prisma_migrations','CREATE TABLE orai.forbidden(id int)',"UPDATE orai.environment_marker SET environment='TEST'"])await assert.rejects(pool.query(sql),{code:'42501'});
  assert.equal((await pool.query(input.manifestSql)).rows.length,0);
 }finally{await pool.end();}
 const phases=(await fs.readFile('/tmp/receipt.jsonl','utf8')).trim().split('\n').map(line=>JSON.parse(line).phase);assert.deepEqual(phases,['started','roles_ready','migrations_applied','runtime_verified','completed']);
 console.log(JSON.stringify({passed:true,platform:process.platform,architecture:process.arch,uid:process.getuid(),tlsVerified:true,bootstrapSuperuser:false,originalMigrations:applied.result.migrations,exactRetry:true,restrictedRuntime:true,journal:true,manifestSql:true,realCloudCalls:0}));
})().catch(error=>{console.error(JSON.stringify({passed:false,error:error.code??error.name}));process.exitCode=1;});
`;
try{
  const openssl=args=>execFileSync('openssl',args,{stdio:'ignore'});
  openssl(['req','-x509','-nodes','-newkey','rsa:2048','-keyout',join(directory,'ca.key'),'-out',join(directory,'ca.crt'),'-days','1','-subj','/CN=orai-maintenance-local-ca','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign']);
  openssl(['req','-nodes','-newkey','rsa:2048','-keyout',join(directory,'server.key'),'-out',join(directory,'server.csr'),'-subj','/CN='+hostname]);
  await writeFile(join(directory,'server.ext'),'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:'+hostname+'\n');
  openssl(['x509','-req','-in',join(directory,'server.csr'),'-CA',join(directory,'ca.crt'),'-CAkey',join(directory,'ca.key'),'-CAcreateserial','-out',join(directory,'server.crt'),'-days','1','-sha256','-extfile',join(directory,'server.ext')]);
  await writeFile(join(directory,'Dockerfile'),'FROM postgres:17.10-bookworm\nCOPY --chown=postgres:postgres server.key server.crt /run/tls/\nRUN chmod 600 /run/tls/server.key\n');
  docker(['build','-t',fixtureImage,directory]);docker(['network','create','--internal',network]);
  docker(['run','-d','--name',database,'--network',network,'--network-alias',hostname,'--memory','256m','--cpus','1','--pids-limit','128',
    '-e','POSTGRES_USER=fixture_admin','-e','POSTGRES_PASSWORD='+password,fixtureImage,'postgres','-c','ssl=on','-c','ssl_cert_file=/run/tls/server.crt','-c','ssl_key_file=/run/tls/server.key']);
  // The entrypoint's temporary initialization server accepts local sockets;
  // only the final server listens on TCP and remains available to the client.
  let ready=false;for(let count=0;count<30;count++){try{docker(['exec',database,'pg_isready','-h','127.0.0.1','-U','fixture_admin']);ready=true;break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready);
  assert.match(password,/^[a-z0-9-]+$/);
  docker(['exec',database,'psql','-U','fixture_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',"CREATE ROLE postgres LOGIN NOSUPERUSER NOCREATEDB CREATEROLE INHERIT NOBYPASSRLS PASSWORD '"+password+"'; ALTER DATABASE postgres OWNER TO postgres;"]);
  const input={ref,hostname,password,ca:(await readFile(join(directory,'ca.crt'))).toString('base64'),manifestSql:await readFile(join(root,'infra/vps/backup-objects.sql'),'utf8')};
  const result=docker(['run','--rm','--platform','linux/amd64','--network',network,'--read-only','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=32m,mode=0700,uid=1000,gid=1000',
    '--user','node','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','768m','--memory-swap','768m','--cpus','1','--pids-limit','128',
    '-e','NODE_OPTIONS=--max-old-space-size=192','--entrypoint','node',image,'-e',child,JSON.stringify(input)]);
  const proof=JSON.parse(result);assert.equal(proof.passed,true);console.log(JSON.stringify(proof));
}finally{
  try{docker(['rm','-fv',database]);}catch{}try{docker(['network','rm',network]);}catch{}try{docker(['image','rm',fixtureImage]);}catch{}
  await rm(directory,{recursive:true,force:true});
}
