import assert from'node:assert/strict';
import{createRequire}from'node:module';import{fileURLToPath}from'node:url';
import{join}from'node:path';import{mkdtemp,mkdir,writeFile,readFile,copyFile,lstat,rename,rm}from'node:fs/promises';
import{tmpdir}from'node:os';import{createHash,randomBytes,randomUUID}from'node:crypto';
import{Readable}from'node:stream';import{execFileSync}from'node:child_process';
const root=fileURLToPath(new URL('../../../',import.meta.url)),api=createRequire(join(root,'apps/api/package.json'));
const {Test}=api('@nestjs/testing'),{AppModule}=api('./.test-build/src/app.module.js'),{APP_CONFIG,loadConfiguration}=api('./.test-build/src/config/configuration.js');
const{configureApp}=api('./.test-build/src/common/configure-app.js'),{createLocalFixture}=api('./.test-build/test/local-fixture.js');
const{createDatabaseClient}=api('./.test-build/src/database/client.js'),{provisionLocalDatabase}=api('./.test-build/scripts/local-database.js');
const{demoId,DemoIdentityScenarios}=api('./.test-build/scripts/demo-fixtures.js');
const classes=Object.fromEntries(['FilesService','SkillFilesService','SkillsService','ContentService','ProductionPlansService','ProjectOriginalFilesService','CatalogAdminAccessService'].map(name=>{
 const files={FilesService:'operations/files.service',SkillFilesService:'operations/skill-files.service',SkillsService:'operations/skills.service',ContentService:'operations/content.service',ProductionPlansService:'operations/production-plans.service',ProjectOriginalFilesService:'operations/project-original-files.service',CatalogAdminAccessService:'catalog/admin-access.service'};
 return[name,api('./.test-build/src/'+files[name]+'.js')[name]];
}));
const evidence=join(root,'.local/local-continuation-20261023/restore'),checks=[];
const sha=value=>createHash('sha256').update(value).digest('hex');
const pass=label=>{checks.push(label);console.log('PASS '+label);};
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const docker=(args,options={})=>execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),...args],{cwd:root,maxBuffer:20*1024*1024,timeout:60000,...options});
let fixture,app,restoredApp,restored,restoreName,created=false,directory,manifest,phase='setup',proof,failed=false;
async function application(configuration,owner){
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue(configuration).compile();
 const app=module.createNestApplication({logger:false});configureApp(app);await app.init();
 return{app,access:await app.get(classes.CatalogAdminAccessService).authorizeLocalOwner(owner.client,DemoIdentityScenarios.admin.id)};
}
function stream(bytes){const r=Readable.from([bytes]);r.headers={'content-type':'application/octet-stream','content-length':String(bytes.length)};return r;}
async function snapshot(client){
 const names=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='orai' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(r=>r.table_name),tables={};
 for(const name of names){const rows=(await client.query('SELECT md5(to_jsonb(r)::text) AS digest FROM orai.'+quote(name)+' r ORDER BY digest')).rows.map(r=>r.digest);tables[name]={rows:rows.length,digest:sha(JSON.stringify(rows))};}
 return tables;
}
async function objectManifest(client){
 const objects=[];
 for(const table of ['asset_files','skill_reference_files','project_original_files']){
  const rows=(await client.query('SELECT id,storage_key,byte_size,checksum,mime_type FROM orai.'+quote(table)+" WHERE status='AVAILABLE' ORDER BY id")).rows;
  for(const r of rows)objects.push({table,id:r.id,key:r.storage_key,byteSize:r.byte_size,checksum:r.checksum,mimeType:r.mime_type});
 }
 return objects;
}
async function verifyObjects(dir,objects){
 for(const item of objects){assert.match(item.key,/^[0-9a-f-]{36}\.blob$/);const p=join(dir,item.key),stat=await lstat(p);assert.ok(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.size,item.byteSize);assert.equal(sha(await readFile(p)),item.checksum);}
}
async function contentBytes(value){const chunks=[];for await(const chunk of value.stream)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);}
try{
 assert.equal(process.argv.length,2,'Only this fixed TEST-only proof is supported');
 await mkdir(evidence,{recursive:true});process.chdir(join(root,'apps/api'));fixture=await createLocalFixture('t09');
 directory=await mkdtemp(join(tmpdir(),'orai-local-restore-'));const sourceDir=join(directory,'source'),backupDir=join(directory,'backup'),restoreDir=join(directory,'restored');
 for(const dir of[sourceDir,backupDir,restoreDir])await mkdir(dir,{mode:0o700});
 const config={...fixture.configuration,auth:null,assets:{...fixture.configuration.assets,driver:'local',directory:sourceDir}};
 const source=await application(config,fixture.owner);app=source.app;const access=source.access;
 const files=app.get(classes.FilesService),skills=app.get(classes.SkillsService),skillFiles=app.get(classes.SkillFilesService),originals=app.get(classes.ProjectOriginalFilesService);
 phase='three verified object kinds through existing services';
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1kAAAAASUVORK5CYII=','base64');
 const media=await files.prepare(access,{productVersionId:demoId('demo-partner-v2'),kind:'cover',fileName:'restore.png',mimeType:'image/png',byteSize:png.length,checksum:sha(png),requestId:randomUUID()});
 await files.upload(access,media.id,stream(png));await files.complete(access,media.id,{requestId:randomUUID()});
 const skillManifest={schemaVersion:1,domain:'copy',name:'隔离恢复方法',description:'仅验证数据库和对象的恢复',purposes:['copywriting'],styles:['紫色'],supportedForms:['web'],
  inputs:[{key:'creative-profile',description:'固定设定',required:true}],outputs:[{key:'copy',description:'固定样例'}],instructions:'保留具体观察。',examples:[],references:[]};
 phase="create fixture skill";const skill=await skills.create(access,'copy',{slug:'restore-'+randomUUID(),manifest:skillManifest,requestId:randomUUID()});
 const md=Buffer.from('隔离恢复参考：固定测试文件，不是实际商品内容。');
 phase="upload fixture reference";const reference=await skillFiles.prepare(access,'copy',skill.skillId,{fileName:'restore.md',mimeType:'text/markdown',byteSize:md.length,checksum:sha(md),requestId:randomUUID()});
 await skillFiles.upload(access,'copy',skill.skillId,reference.id,stream(md));await skillFiles.complete(access,'copy',skill.skillId,reference.id,{requestId:randomUUID()});
 phase="attach fixture reference";await skills.save(access,'copy',skill.skillId,skill.id,{expectedRevision:skill.revision,requestId:randomUUID(),manifest:{...skillManifest,references:[{path:'references/restore.md',fileId:reference.id}]}});
 const profile={schemaVersion:1,title:'隔离恢复样例',audience:'测试环境',situation:'恢复核对',emotionalGoal:'可核对',understandingGoal:'引用完整',takeaway:'测试不代表商品',perspective:'self',experienceForm:'web',pace:'从容',world:'测试空间',language:'明确',visual:'紫色',sound:'安静',channels:['manual'],deliverables:['assessment','copy','cover','video'],reportPlan:{schemaVersion:1,title:'固定报告',narrative:'隔离样例',presentation:'standard',sections:[{sectionId:'next',title:'下一步',purpose:'核对恢复'}]}};
 phase="create fixture profile";const fixed=await app.get(classes.ContentService).saveProfile(access,demoId('demo-partner'),{expectedRevision:0,profile,requestId:randomUUID()});
 phase="save fixture plan";const plan=await app.get(classes.ProductionPlansService).save(access,demoId('demo-partner'),{expectedRevision:0,requestId:randomUUID(),plan:{schemaVersion:1,title:'隔离恢复计划',creativeProfileRevisionId:fixed.id,selection:{basis:'manual',rationale:'固定测试样例',evidenceKeys:[]},freshnessWindowHours:24,evidence:[],retention:'platform_originals_and_exact_methods',modules:[{moduleKey:'web',title:'网页原件',domain:'experience',required:true,purpose:'恢复核对',dependsOn:[],target:{form:'web',runtime:null},methodPurposes:['scene_design','report_presentation'],methodRetention:'manifest_instructions_and_references',outputs:[{outputKey:'web',label:'固定网页',kind:'web_bundle',required:true,original:{storage:'platform',representation:'file'},files:[{fileKey:'source',label:'原件',purpose:'original',required:true,mimeTypes:['text/html'],sourceUrl:null}]}]}]}});
 const html=Buffer.from('<!doctype html><html><head><title>隔离恢复</title></head><body>固定测试原件</body></html>');
 phase="upload fixture original";const original=await originals.prepare(access,{target:{type:'project_original',planModuleId:plan.modules[0].id,outputKey:'web',fileKey:'source'},fileName:'restore.html',mimeType:'text/html',byteSize:html.length,checksum:sha(html),requestId:randomUUID()});
 await originals.upload(access,original.id,stream(html));await originals.complete(access,original.id,{requestId:randomUUID()});
 pass(phase);await app.close();app=null;
 phase='consistent database snapshot and object manifest';
 const client=await fixture.owner.pool.connect();let dump,sourceTables,objects;
 const ownerUrl=new URL(fixture.env.MIGRATION_DATABASE_URL),dbId=docker(['compose','ps','-q','db'],{encoding:'utf8'}).trim();assert.match(dbId,/^[0-9a-f]+$/);
 const pgEnv={...process.env,PGPASSWORD:decodeURIComponent(ownerUrl.password)};
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const snapshotId=(await client.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
  sourceTables=await snapshot(client);objects=await objectManifest(client);assert.equal(objects.length,3);await verifyObjects(sourceDir,objects);
  dump=docker(['exec','-e','PGPASSWORD',dbId,'pg_dump','-h','127.0.0.1','-U',decodeURIComponent(ownerUrl.username),'--format=custom','--schema=orai','--no-owner','--no-acl','--snapshot='+snapshotId,fixture.name],{env:pgEnv});
  for(const item of objects)await copyFile(join(sourceDir,item.key),join(backupDir,item.key));await verifyObjects(backupDir,objects);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 manifest={schemaVersion:1,environment:'TEST',databaseSchema:'orai',dumpSha256:sha(dump),dumpBytes:dump.length,tables:sourceTables,objects};
 await writeFile(join(evidence,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});pass(phase);
 phase='pg_restore into a new empty TEST database reproduces every table digest';
 restoreName='orai_test_t09_restore_'+randomBytes(5).toString('hex');assert.match(restoreName,/^orai_test_t09_restore_[a-f0-9]{10}$/);
 await fixture.owner.pool.query('CREATE DATABASE '+quote(restoreName));created=true;
 docker(['exec','-i','-e','PGPASSWORD',dbId,'pg_restore','-h','127.0.0.1','-U',decodeURIComponent(ownerUrl.username),'--dbname='+restoreName,'--no-owner','--no-acl','--exit-on-error'],{env:pgEnv,input:dump});
 const restoredEnv={...fixture.env,DEMO_SEED_DATABASE:restoreName};for(const key of['DATABASE_URL','MIGRATION_DATABASE_URL']){const u=new URL(restoredEnv[key]);u.pathname='/'+restoreName;restoredEnv[key]=u.toString();}
 const restoredConfig=loadConfiguration(restoredEnv);restored=createDatabaseClient({...restoredConfig,databaseUrl:restoredEnv.MIGRATION_DATABASE_URL});
 assert.deepEqual(await snapshot(restored.pool),sourceTables);assert.deepEqual(await objectManifest(restored.pool),objects);pass(phase);
 phase='restored object bytes match the same database manifest';
 for(const item of objects)await copyFile(join(backupDir,item.key),join(restoreDir,item.key));await verifyObjects(restoreDir,objects);pass(phase);
 phase='missing and same-length damaged objects are rejected before accepting a restore';
 const target=join(restoreDir,objects[0].key),held=join(directory,'held-object');await rename(target,held);await assert.rejects(verifyObjects(restoreDir,objects));await rename(held,target);
 const good=await readFile(target),bad=Buffer.from(good);bad[0]^=1;await writeFile(target,bad);await assert.rejects(verifyObjects(restoreDir,objects));await writeFile(target,good);await verifyObjects(restoreDir,objects);pass(phase);
 phase='restore identity is explicitly rebound in TEST and restricted runtime permissions are reapplied';
 const marker=await restored.pool.query("UPDATE orai.environment_marker SET database_name=$1 WHERE id=1 AND environment='TEST' AND database_name=$2",[restoreName,fixture.name]);assert.equal(marker.rowCount,1);
 await provisionLocalDatabase(restoredEnv);
 const afterIdentity=await snapshot(restored.pool);for(const [name,value]of Object.entries(sourceTables))if(name!=='environment_marker')assert.deepEqual(afterIdentity[name],value,name);
 pass(phase);
 phase='restored existing services read media, skill attachment and HTML original without executing it';
 const boot=await application({...restoredConfig,auth:null,assets:{...restoredConfig.assets,driver:'local',directory:restoreDir}},restored);restoredApp=boot.app;
 assert.deepEqual(await contentBytes(await restoredApp.get(classes.FilesService).content(boot.access,media.id)),png);
 assert.deepEqual(await contentBytes(await restoredApp.get(classes.SkillFilesService).content(boot.access,'copy',skill.skillId,reference.id)),md);
 assert.deepEqual(await contentBytes(await restoredApp.get(classes.ProjectOriginalFilesService).content(boot.access,original.id)),html);
 const skillRow=await restored.client.styleSkillAttachment.findFirstOrThrow({where:{versionId:skill.id,fileId:reference.id}});assert.equal(skillRow.path,'references/restore.md');
 assert.deepEqual(await snapshot(fixture.owner.pool),sourceTables);pass(phase);
 proof={passed:true,checks,tableCount:Object.keys(sourceTables).length,rowCount:Object.values(sourceTables).reduce((s,t)=>s+t.rows,0),objectKinds:objects.map(o=>o.table),objects:objects.length,dumpSha256:manifest.dumpSha256,dumpBytes:dump.length,
  sourceQuiesced:true,exportedSnapshotUsed:true,sourceDatabaseUnchanged:true,identityChange:'only restored TEST environment_marker.database_name is intentionally rebound after exact raw restore comparison',
  auth:'local owner capability in TEST only; no real login or credential issuance',rawDumpRetained:false,physicalDeviceValidated:false,cloudRestoreValidated:false,cloudCalls:0,published:false};
}catch(error){failed=true;const redact=value=>{let s=String(value);if(fixture)for(const key of['DATABASE_URL','MIGRATION_DATABASE_URL']){const u=new URL(fixture.env[key]);for(const x of[u.toString(),decodeURIComponent(u.password)])if(x)s=s.replaceAll(x,'[REDACTED]');}return s;};await writeFile(join(evidence,'failure.json'),JSON.stringify({phase,error:redact(error)},null,2)+'\n');console.error(JSON.stringify({passed:false,phase,errorType:error.name}));process.exitCode=1;
}finally{
 try{await restoredApp?.close();await app?.close();await restored?.close();if(created){const active=(await fixture.owner.pool.query('SELECT pid FROM pg_stat_activity WHERE datname=$1',[restoreName])).rows;assert.deepEqual(active,[]);await fixture.owner.pool.query('DROP DATABASE '+quote(restoreName));}}
 finally{await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});}
}
if(!failed){proof.temporaryDatabasesRemoved=true;proof.temporaryObjectDirectoriesRemoved=true;await writeFile(join(evidence,'verification.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,tables:proof.tableCount,objects:proof.objects,cleanup:true}));}
