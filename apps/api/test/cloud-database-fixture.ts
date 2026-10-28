import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {createCloudDatabaseConnections,type CloudDatabaseTarget,type CloudDatabaseConnections} from '../scripts/cloud-database';
const execute=promisify(execFile);
export async function cloudDatabaseFixture(){
  const root=resolve(process.cwd(),'../..'),directory=await mkdtemp(join(root,'.local/cloud-database-'));
  const suffix=randomUUID().slice(0,8),name='orai-cloud-db-'+suffix,image='orai-cloud-db-proof:'+suffix;
  const bootstrapPassword='bootstrap-'+randomUUID(),ownerPassword='owner-'+randomUUID(),runtimePassword='runtime-'+randomUUID();
  const docker=(args:string[])=>execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),...args],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}).trim();
  let management:Pool|undefined;
  const cleanup=async()=>{await management?.end();try{docker(['rm','-fv',name]);}catch{}try{docker(['image','rm',image]);}catch{}await rm(directory,{recursive:true,force:true});};
  try{
    execFileSync('openssl',['req','-x509','-nodes','-newkey','rsa:2048','-keyout',join(directory,'ca.key'),'-out',join(directory,'ca.crt'),'-days','1','-subj','/CN=orai-isolated-proof-ca',
      '-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign'],{stdio:'ignore'});
    execFileSync('openssl',['req','-nodes','-newkey','rsa:2048','-keyout',join(directory,'server.key'),'-out',join(directory,'server.csr'),'-subj','/CN=localhost'],{stdio:'ignore'});
    await writeFile(join(directory,'server.ext'),'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=IP:127.0.0.1,DNS:localhost\n');
    execFileSync('openssl',['x509','-req','-in',join(directory,'server.csr'),'-CA',join(directory,'ca.crt'),'-CAkey',join(directory,'ca.key'),'-CAcreateserial','-out',join(directory,'server.crt'),'-days','1','-sha256','-extfile',join(directory,'server.ext')],{stdio:'ignore'});
    const ca=await readFile(join(directory,'ca.crt'));
    await writeFile(join(directory,'Dockerfile'),'FROM postgres:17.10-bookworm\nCOPY --chown=postgres:postgres server.key server.crt /run/pg-tls/\nRUN chmod 600 /run/pg-tls/server.key\n');
    docker(['build','-t',image,directory]);
    docker(['run','-d','--name',name,'--memory','256m','--cpus','1','--pids-limit','128','--security-opt','no-new-privileges:true',
      '-e','POSTGRES_USER=postgres','-e','POSTGRES_PASSWORD='+bootstrapPassword,'-e','POSTGRES_DB=postgres','-p','127.0.0.1::5432',image,
      'postgres','-c','ssl=on','-c','ssl_cert_file=/run/pg-tls/server.crt','-c','ssl_key_file=/run/pg-tls/server.key']);
    const ports=JSON.parse(docker(['inspect',name,'--format','{{json .NetworkSettings.Ports}}'])),port=Number(ports['5432/tcp'][0].HostPort);
    management=new Pool({host:'127.0.0.1',port,user:'postgres',password:bootstrapPassword,database:'postgres',ssl:{ca,rejectUnauthorized:true},max:1,connectionTimeoutMillis:1000});
    let ready=false;for(let count=0;count<40;count++){try{await management.query('SELECT 1');ready=true;break;}catch{}await new Promise<void>(resolve=>setTimeout(resolve,100));}
    if(!ready)throw Error('Isolated TLS database did not become ready');
    const projectRef='a'.repeat(20),hostname='aws-0-unit.pooler.supabase.com';
    const envFor=(database:string)=>({APP_ENV:'production',NODE_ENV:'production',DATABASE_SSL_MODE:'verify-full',CLOUD_DATABASE_PROJECT_REF:projectRef,
      CLOUD_DATABASE_EXPECTED_HOST:hostname,CLOUD_DATABASE_NAME:database,CLOUD_DATABASE_CA_FILE:join(directory,'ca.crt'),CLOUD_DATABASE_CA_SHA256:createHash('sha256').update(ca).digest('hex'),
      CLOUD_DATABASE_BOOTSTRAP_URL:'postgresql://postgres.'+projectRef+':'+bootstrapPassword+'@'+hostname+':5432/'+database+'?schema=orai',
      MIGRATION_DATABASE_URL:'postgresql://orai_owner.'+projectRef+':'+ownerPassword+'@'+hostname+':5432/'+database+'?schema=orai',
      DATABASE_URL:'postgresql://orai_app.'+projectRef+':'+runtimePassword+'@'+hostname+':5432/'+database+'?schema=orai'});
    async function newDatabase(){const database='orai_test_cloud_'+randomUUID().replaceAll('-','').slice(0,12);await management!.query('CREATE DATABASE "'+database+'"');return {database,env:envFor(database)};}
    const localUrl=(raw:string)=>{const value=new URL(raw);value.hostname='127.0.0.1';value.port=String(port);value.username=decodeURIComponent(value.username).split('.')[0]!;return value;};
    const connections=async(target:CloudDatabaseTarget):Promise<CloudDatabaseConnections>=>{
      // Exercise the production CA pinning/copy, pools and official Prisma child;
      // only connection destinations are mapped to this isolated TLS fixture.
      const actual=await createCloudDatabaseConnections({...target,bootstrapUrl:localUrl(target.bootstrapUrl).toString(),
        migrationUrl:localUrl(target.migrationUrl).toString(),runtimeUrl:localUrl(target.runtimeUrl).toString()});
      return {...actual,async migrate(){
        try{
          await actual.migrate();
        }catch(error){
          const diagnostic=error as {stdout?:string;stderr?:string};
          let detail=(diagnostic.stdout??'')+'\n'+(diagnostic.stderr??'');
          for(const secret of [bootstrapPassword,ownerPassword,runtimePassword])detail=detail.replaceAll(secret,'[redacted]');
          await writeFile(join(root,'.local','prisma-cloud-diagnostic-'+randomUUID()+'.log'),detail,{mode:0o600,flag:'wx'});
          throw error;
        }
      }};
    };
    return {directory,ca,port,management,envFor,newDatabase,connections,cleanup};
  }catch(error){await cleanup();throw error;}
}
