import 'reflect-metadata';
import { currentSkillManifest } from './skill-policy-fixture';
import { emptyProductImplementationPlan } from '@orai/contracts/admin';
import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { mkdtemp,rm,readFile,writeFile,open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { crc32 } from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Request } from 'express';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CreativeProfileSchema, MachineProjectResultSchema, ProductionPlanRevisionSchema, MachineProjectMethodSnapshotSchema,
  MachineProjectDraftResultSchema, MachineProjectProductionRecordSchema, skillPurposes, StyleSkillManifestSchema } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { CatalogAdminAccessService,type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { CatalogAdminService } from '../src/operations/catalog-admin.service';
import { MachineCredentialsService } from '../src/operations/machine-credentials.service';
import { MachineProjectsService } from '../src/operations/machine-projects.service';
import { MachineUploadService } from '../src/operations/machine-upload.service';
import { ProjectReviewService } from '../src/operations/project-review.service';
import { ProjectOriginalFilesService } from '../src/operations/project-original-files.service';
import { SkillsService } from '../src/operations/skills.service';
import { FileCleanupService } from '../src/operations/file-cleanup.service';
import { defaultExperience } from '../src/catalog/experience-authoring';
import { demoId,DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';
import { inspectOriginal } from '../src/operations/original-content';
import { Prisma } from '../src/generated/prisma/client';

let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,access:CatalogAdminAccess,
  projects:MachineProjectsService,reviews:ProjectReviewService,directory:string,base:string;
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1kAAAAASUVORK5CYII=','base64');
const html=Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>合成原件</title></head><body><button>观察一下自己</button><script>throw new Error("must not execute")</script></body></html>');
before(async()=>{
  fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-project-retention-'));
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG)
    .useValue({...fixture.configuration,assets:{...fixture.configuration.assets,driver:'local',directory}}).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
  access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
  projects=app.get(MachineProjectsService);reviews=app.get(ProjectReviewService);
});
after(async()=>{await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});});
type Domain=keyof typeof skillPurposes;
async function fresh(sceneOnly=false){
  const original=await app.get(CatalogAdminService).product(access,demoId('demo-partner'));
  const workspace=await projects.createWorkspace(access,{name:'项目留存隔离授权',categoryIds:[original.categoryId],maxProjects:1,maxMethodsPerProject:10,
    expiresAt:new Date(Date.now()+7200_000).toISOString(),requestId:randomUUID()});
  const grants={} as Record<Domain,{access:CatalogAdminAccess;token:string;id:string}>;
  for(const domain of ['assessment','cover','video','copy','experience'] as const){
    const issued=await app.get(MachineCredentialsService).create(access,{name:'合成领域连接',domain,workspaceId:workspace.id,
      permissions:['content:read','content:write','skills:read','skills:write','context:read','projects:read','methods:create',
        ...(domain==='assessment'?['projects:create','projects:write']:[])],productIds:[],skillIds:[],
      expiresAt:new Date(Date.now()+3600_000).toISOString(),requestId:randomUUID()});
    grants[domain]={access:await app.get(CatalogAdminAccessService).authorizeMachine(issued.token!,domain),token:issued.token!,id:issued.credential.id};
  }
  const profile=CreativeProfileSchema.parse({schemaVersion:1,title:'共同创作设定',audience:'自我观察者',situation:'日常沟通',emotionalGoal:'感到被理解',
    understandingGoal:'理解自己的表达习惯',takeaway:'一个具体行动',perspective:'self',experienceForm:sceneOnly?'3d':'web',pace:'从容',world:'合成观察空间',
    language:'具体直接',visual:'紫色',sound:'安静',channels:['manual'],deliverables:['assessment','copy','cover','video'],
    reportPlan:{schemaVersion:1,title:'观察报告',narrative:'观察与下一步',presentation:'standard',sections:[{sectionId:'next',title:'下一步',purpose:'形成行动'}]}});
  const file=(mime:string)=>({fileKey:'source',purpose:'original',label:'实际原件',required:true,mimeTypes:mime==='text/html'?[mime,'application/zip']:[mime],sourceUrl:'https://expired.example.test/unavailable'});
  const output=(outputKey:string,kind:string,mime?:string)=>({outputKey,label:outputKey,kind,required:true,
    original:{storage:'platform',representation:mime?'file':'structured'},files:mime?[file(mime)]:[]});
  const module=(domain:Domain,outputs:unknown[],dependsOn:string[]=[])=>({moduleKey:domain,title:domain,domain,required:true,purpose:'隔离留存验收',dependsOn,
    target:{form:sceneOnly?'3d':'web',runtime:null as unknown},methodPurposes:[...skillPurposes[domain]],methodRetention:'manifest_instructions_and_references',outputs});
  const experience=module('experience',[output('web',sceneOnly?'scene_bundle':'web_bundle',sceneOnly?'model/gltf-binary':'text/html')],sceneOnly?[]:['assessment','cover']);
  if(!sceneOnly)experience.target.runtime={renderer:{key:'dom-choice',version:1},reportRenderer:{key:'legacy-text',version:1},inputSchema:'single_choice_v1',engine:'dimensions_v1',reportSchema:'report_content_v1'};
  const {isDemo:_,...publicSample}=original.publicSample;
  const project=MachineProjectResultSchema.parse(await projects.execute(grants.assessment.access,'project_bootstrap',{
    requestId:randomUUID(),projectKey:'retention-'+randomUUID(),product:{slug:'retention-'+randomUUID(),name:'合成留存项目',hook:'看见自己的节奏',summary:'隔离技术验收',
      description:'仅验证平台留存闭环',categoryId:original.categoryId,priceFen:original.priceFen,durationMinutes:5,experienceType:original.experienceType,themeKey:original.themeKey,publicSample},profile,
    plan:{schemaVersion:2,productPlan:emptyProductImplementationPlan(),title:'固定制作计划',selection:{basis:'manual',rationale:'技术验收',evidenceKeys:[]},freshnessWindowHours:24,evidence:[],
      retention:'platform_originals_and_exact_methods',modules:sceneOnly?[experience]:[module('assessment',[output('questions','assessment'),output('report','report')]),
        module('cover',[output('cover','image','image/png')]),module('copy',[output('copy','copy')],['assessment']),experience,
        module('video',[output('video','video','video/webm')],['assessment','copy','cover','experience'])]}}));
  const plan=ProductionPlanRevisionSchema.parse(await projects.execute(grants.assessment.access,'project_plan_get',{planRevisionId:project.planRevisionId}));
  return {project,plan,profile,grants,module:(domain:Domain)=>plan.modules.find(m=>m.definition.domain===domain)!,
    methods:{} as Record<Domain,{snapshotId:string;digest:string}[]>,records:[] as ReturnType<typeof MachineProjectProductionRecordSchema.parse>[],
    sources:[] as {skillId:string;versionId:string}[],drafts:{} as Record<Domain,ReturnType<typeof MachineProjectDraftResultSchema.parse>>,originalId:''};
}
type Context=Awaited<ReturnType<typeof fresh>>;
async function methods(c:Context,domain:Domain,withReference=false){
  const manifest=currentSkillManifest({schemaVersion:1,domain,name:'项目候选方法',description:'技术验收候选方法',purposes:[...skillPurposes[domain]],styles:['紫色'],
    supportedForms:[c.module(domain).definition.target.form],inputs:[{key:'creative-profile',description:'固定共同设定',required:true}],outputs:[{key:'deliverable',description:'本模块产物'}],
    instructions:'从具体观察解释理解与行动。',examples:[],references:[]});
  const created=await projects.execute(c.grants[domain].access,'project_method_create',{productId:c.project.productId,methodKey:domain,manifest,requestId:randomUUID()}) as {skillId:string;versionId:string};
  c.sources.push(created);
  let version=await app.get(SkillsService).readVersion(access,domain,created.skillId,created.versionId);
  if(withReference){
    const bytes=Buffer.from('保留准确观察和可尝试的行动。');
    const file=await upload(c,domain,{type:'skill_reference',skillId:created.skillId},bytes,'guide.md','text/markdown');
    version=await app.get(SkillsService).save(access,domain,created.skillId,created.versionId,{expectedRevision:version.revision,requestId:randomUUID(),
      manifest:{...manifest,references:[{path:'references/guide.md',fileId:file.fileId}]}});
  }
  const module=c.module(domain),result=[];
  for(const purpose of skillPurposes[domain]){
    const fixed=MachineProjectMethodSnapshotSchema.parse(await projects.execute(c.grants[domain].access,'project_method_capture',{planModuleId:module.id,
      expectedModuleDigest:module.digest,purpose,sourceVersionId:version.id,expectedSourceDigest:version.digest,expectedSourceRevision:version.revision,requestId:randomUUID()}));
    result.push({snapshotId:fixed.id,digest:fixed.digest});
  }c.methods[domain]=result;return result;
}
async function upload(c:Context,domain:Domain,target:unknown,bytes:Buffer,fileName:string,mimeType:string){
  const g=c.grants[domain],service=app.get(MachineUploadService),prepared=await service.prepare(g.access,g.token,domain,{requestId:randomUUID(),target,
    fileName,mimeType,byteSize:bytes.length,checksum:hash(bytes)});
  const stream=Readable.from([bytes]) as unknown as Request;stream.headers={'content-type':'application/octet-stream','content-length':String(bytes.length)};
  await service.upload(g.access,domain,prepared.uploadId,prepared.ticket,stream);
  return service.complete(g.access,domain,prepared.uploadId,prepared.ticket,{requestId:randomUUID()});
}
async function draft(c:Context,domain:Domain,payload:unknown){
  const module=c.module(domain),result=MachineProjectDraftResultSchema.parse(await projects.execute(c.grants[domain].access,'project_draft_save',{
    planModuleId:module.id,expectedModuleDigest:module.digest,methods:c.methods[domain],requestId:randomUUID(),payload}));c.drafts[domain]=result;return result;
}
async function record(c:Context,domain:Domain,outputs:unknown[],inputs=c.records.filter(r=>c.module(domain).definition.dependsOn.includes(c.plan.modules.find(m=>m.id===r.planModuleId)!.moduleKey)),expectedRevision=0){
  const module=c.module(domain),row=MachineProjectProductionRecordSchema.parse(await projects.execute(c.grants[domain].access,'project_production_save',{
    planModuleId:module.id,expectedModuleDigest:module.digest,expectedRevision,requestId:randomUUID(),methods:c.methods[domain],outputs,
    inputs:inputs.map(r=>({recordId:r.id,digest:r.digest})),external:{client:'isolated-production',runKey:'run-'+randomUUID(),note:'外部制作声明，不表示平台执行',
      startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}}));c.records=c.records.filter(r=>r.planModuleId!==module.id);c.records.push(row);return row;
}
const nativeOutput=(outputKey:string,d:{revisionId:string;digest:string},kind='content_revision')=>({kind,outputKey,revisionId:d.revisionId,digest:d.digest});
async function complete(c:Context,importOriginal=true){
  for(const domain of ['assessment','cover','copy','experience','video'] as const)await methods(c,domain,domain==='assessment');
  const config=await fixture.runtime.client.productVersion.findFirstOrThrow({where:{productId:demoId('demo-partner')}});
  const assessment=await draft(c,'assessment',{kind:'assessment',configuration:config.configuration,expectedRevision:0});
  await record(c,'assessment',[nativeOutput('questions',assessment),nativeOutput('report',assessment)]);
  const coverFile=await upload(c,'cover',{type:'media',productVersionId:assessment.productVersionId,kind:'cover'},png,'cover.png','image/png');
  const asset=(content:unknown,fileId:string|null)=>({kind:'asset',draft:{productVersionId:assessment.productVersionId,platform:'manual',variant:'primary',fileId,
    expectedRevision:0,authoring:{schemaVersion:1,creativeProfileRevisionId:c.project.creativeProfileRevisionId,content,media:{localArchive:null,previewFileId:null},inputs:[]}}});
  const cover=await draft(c,'cover',asset({kind:'cover',title:'看见自己',description:'合成封面'},coverFile.fileId));await record(c,'cover',[nativeOutput('cover',cover)]);
  const copy=await draft(c,'copy',asset({kind:'copy',blocks:[{blockId:'hook',role:'hook',text:'看见自己表达的节奏。'},{blockId:'cta',role:'cta',text:'从一次观察开始。'}]},null));
  await record(c,'copy',[nativeOutput('copy',copy)]);
  const resource=await upload(c,'experience',{type:'experience_resource',productVersionId:assessment.productVersionId,purpose:'illustration'},png,'scene.png','image/png');
  const version=await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:assessment.productVersionId}}),profile=await fixture.runtime.client.creativeProfileRevision.findUniqueOrThrow({where:{id:c.project.creativeProfileRevisionId}});
  const manifest=defaultExperience(version,'purple',profile);manifest.resources=[{resourceId:'scene',fileId:resource.fileId!,purpose:'illustration',label:'合成资源',checksum:resource.checksum,byteSize:resource.byteSize,mimeType:'image/png'}];
  const experience=await draft(c,'experience',{kind:'experience',productVersionId:version.id,draft:{manifest,reportPlan:c.profile.reportPlan,
    expectedRevision:0,expectedVersionRevision:version.revision,note:'原生体验制作稿'}});
  const outputs:unknown[]=[nativeOutput('web',experience,'experience_revision')];
  if(importOriginal){const original=await upload(c,'experience',{type:'project_original',planModuleId:c.module('experience').id,outputKey:'web',fileKey:'source'},html,'web.html','text/html');
    c.originalId=original.fileId!;outputs.push({kind:'original_file',outputKey:'web',fileKey:'source',originalFileId:original.fileId,checksum:original.checksum});}
  await record(c,'experience',outputs);
  const bytes=await readFile(join(process.cwd(),'test/fixtures/preview.webm')),videoFile=await upload(c,'video',{type:'media',productVersionId:version.id,kind:'video'},bytes,'video.webm','video/webm');
  const video=await draft(c,'video',asset({kind:'video',scenes:[{sceneId:'opening',startMs:0,endMs:1000,text:'看见自己表达的节奏，从一次观察开始。'}]},videoFile.fileId));
  await record(c,'video',[nativeOutput('video',video)]);return c;
}
const selection=(c:Context)=>({planRevisionId:c.plan.id,records:c.records.map(r=>({recordId:r.id,digest:r.digest}))});
const action=(r:{revision:number;fingerprint:string;frontierFingerprint:string})=>({expectedRevision:r.revision,expectedFingerprint:r.fingerprint,
  expectedFrontierFingerprint:r.frontierFingerprint,note:'核对固定版本',requestId:randomUUID()});
async function save(c:Context,expectedRevision=0){return reviews.save(access,c.project.productId,{selection:selection(c),expectedRevision,note:'保存项目草稿',requestId:randomUUID()});}
async function bytes(file:Awaited<ReturnType<ProjectReviewService['file']>>){const chunks:Buffer[]=[];for await(const chunk of file.stream)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);}

test('partial project drafts remain savable and cannot be submitted or retained before required modules arrive',async()=>{
  const c=await fresh(),saved=await save(c);assert.equal(saved.status,'draft');assert.equal(saved.archiveReady,false);
  assert.equal(saved.issues.filter(i=>i.code==='MISSING_MODULE').length,5);
  await assert.rejects(reviews.transition(access,saved.id,'submit',action(saved)));
  assert.equal(await fixture.runtime.client.projectReviewRevision.count({where:{productId:c.project.productId}}),1);
});
test('new topic to candidate methods, native drafts, media, authoring, original, return, resubmit and retain completes without publication',async()=>{
  const c=await complete(await fresh()),preview=await reviews.preview(access,c.project.productId,selection(c));
  assert.equal(preview.canSubmit,true,JSON.stringify(preview.issues));assert.equal(preview.manifest.experiences.length,1);assert.equal(preview.manifest.resources.length,1);
  const saved=await save(c),submitted=await reviews.transition(access,saved.id,'submit',action(saved));
  const returned=await reviews.transition(access,submitted.id,'return',{...action(submitted),returns:[{planModuleId:c.module('copy').id,reason:'核对引流语气'}]});
  assert.equal(returned.status,'returned');assert.equal(returned.returns[0]!.reason,'核对引流语气');
  const corrected=await save(c,returned.revision),resubmitted=await reviews.transition(access,corrected.id,'submit',action(corrected));
  const body=action(resubmitted),retained=await reviews.transition(access,resubmitted.id,'retain',body);
  assert.equal(retained.status,'retained');assert.equal(retained.archiveReady,true);assert.equal(retained.manifest.publicationEffect,'none');
  assert.deepEqual(await reviews.transition(access,resubmitted.id,'retain',body),retained);
  assert.deepEqual(await reviews.transition(access,resubmitted.id,'retain',{...body,requestId:randomUUID()}),retained);
  assert.equal((await fixture.runtime.client.product.findUniqueOrThrow({where:{id:c.project.productId}})).status,'DRAFT');
  assert.equal(await fixture.runtime.client.experienceRelease.count({where:{productVersion:{productId:c.project.productId}}}),0);
  assert.equal(await fixture.runtime.client.styleSkillVersion.count({where:{skillId:{in:c.sources.map(s=>s.skillId)},status:'ACTIVE'}}),0);
  assert.equal(hash(await bytes(await reviews.file(access,retained.id,'original',c.originalId))),hash(html));
  const method=retained.manifest.methods.find(m=>m.version.files.length)!;const ref=method.version.files[0]!.file;
  assert.equal(hash(await bytes(await reviews.file(access,retained.id,'method',ref.id))),ref.checksum);
  assert.equal(hash(await bytes(await reviews.file(access,retained.id,'media',retained.manifest.resources[0]!.id))),retained.manifest.resources[0]!.checksum);
  await assert.rejects(reviews.file(access,retained.id,'original',randomUUID()));
});
test('preview or authoring-only delivery does not replace an original web package and source URLs do not count as imports',async()=>{
  const c=await complete(await fresh(),false),preview=await reviews.preview(access,c.project.productId,selection(c));
  assert.equal(preview.canSubmit,false);assert.ok(preview.issues.some(i=>i.code==='MISSING_ORIGINAL'));
  const saved=await save(c);await assert.rejects(reviews.transition(access,saved.id,'submit',action(saved)));
});
test('edits after submission invalidate the observed frontier and cannot approve the earlier submission',async()=>{
  const c=await complete(await fresh()),saved=await save(c),submitted=await reviews.transition(access,saved.id,'submit',action(saved));
  const old=await fixture.runtime.client.contentRevision.findUniqueOrThrow({where:{id:c.drafts.copy.revisionId}});
  await draft(c,'copy',{kind:'asset',draft:{assetId:old.assetId,productVersionId:old.productVersionId,platform:'manual',variant:'primary',fileId:null,
    expectedRevision:old.sourceRevision,authoring:{schemaVersion:1,creativeProfileRevisionId:c.project.creativeProfileRevisionId,
      content:{kind:'copy',blocks:[{blockId:'hook',role:'hook',text:'新的引流文案'}]},media:{localArchive:null,previewFileId:null},inputs:[]}}});
  await assert.rejects(reviews.transition(access,submitted.id,'retain',action(submitted)),(e:any)=>e.code==='REVISION_CONFLICT');
  assert.equal(await fixture.runtime.client.projectReviewRevision.count({where:{productId:c.project.productId,status:'retained'}}),0);
  assert.equal((await reviews.read(access,submitted.id)).status,'submitted');
});
test('damaged native resources or originals block retention without leaving half an approved package',async()=>{
  const c=await complete(await fresh()),saved=await save(c),submitted=await reviews.transition(access,saved.id,'submit',action(saved));
  const file=await fixture.runtime.client.projectOriginalFile.findUniqueOrThrow({where:{id:c.originalId}});await writeFile(join(directory,file.storageKey),'broken source');
  const preview=await reviews.preview(access,c.project.productId,selection(c));assert.equal(preview.canSubmit,false);
  await assert.rejects(reviews.transition(access,submitted.id,'retain',action(submitted)));
  assert.equal(await fixture.runtime.client.projectReviewRevision.count({where:{productId:c.project.productId,status:'retained'}}),0);
  await writeFile(join(directory,file.storageKey),html);
  const resource=preview.manifest.resources[0]!,native=await fixture.runtime.client.assetFile.findUniqueOrThrow({where:{id:resource.id}});
  await writeFile(join(directory,native.storageKey),'broken image');await assert.rejects(reviews.transition(access,submitted.id,'retain',action(submitted)));
  await writeFile(join(directory,native.storageKey),png);
});
test('cross project selections, machine review attempts, scope forgery, and unauthenticated HTTP are denied',async()=>{
  const a=await fresh(),b=await fresh();await assert.rejects(reviews.save(access,a.project.productId,{selection:selection(b),expectedRevision:0,note:'cross',requestId:randomUUID()}));
  await assert.rejects(reviews.save(a.grants.assessment.access,a.project.productId,{selection:selection(a),expectedRevision:0,note:'machine',requestId:randomUUID()}));
  const saved=await save(a);await assert.rejects(reviews.read({actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess,saved.id));
  assert.equal((await fetch(base+'/api/admin/project-reviews/'+saved.id)).status,401);
  assert.equal((await fetch(base+'/api/admin/project-originals/'+randomUUID()+'/content',{headers:{authorization:'Bearer '+a.grants.experience.token}})).status,401);
});
test('concurrent reviewers cannot append conflicting next revisions and retained snapshots and originals cannot be rewritten',async()=>{
  const c=await complete(await fresh()),saved=await save(c),body=action(saved),results=await Promise.allSettled([
    reviews.transition(access,saved.id,'submit',body),reviews.transition(access,saved.id,'submit',{...body,requestId:randomUUID()})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const submitted=(results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof reviews.transition>>>).value;
  const retained=await reviews.transition(access,submitted.id,'retain',action(submitted));
  await assert.rejects(fixture.runtime.client.projectReviewRevision.update({where:{id:retained.id},data:{note:'rewrite'}}));
  await assert.rejects(fixture.runtime.client.projectOriginalFile.update({where:{id:c.originalId},data:{status:'DELETING'}}));
  await assert.rejects(fixture.runtime.client.projectOriginalFile.delete({where:{id:c.originalId}}));
  const assetId=retained.manifest.records.flatMap(r=>r.outputs).find(o=>o.fileId)!.fileId!;
  await assert.rejects(fixture.runtime.client.assetFile.update({where:{id:assetId},data:{status:'DELETING'}}));
});
test('interrupted, invalid or revoked original imports never become available and do not satisfy a production slot',async()=>{
  const c=await fresh(),module=c.module('experience'),g=c.grants.experience,service=app.get(MachineUploadService);
  const prepare=()=>service.prepare(g.access,g.token,'experience',{requestId:randomUUID(),target:{type:'project_original',planModuleId:module.id,outputKey:'web',fileKey:'source'},
    fileName:'web.html',mimeType:'text/html',byteSize:html.length,checksum:hash(html)});
  const pending=await prepare(),interrupted=Readable.from([html.subarray(0,10)]) as unknown as Request;interrupted.headers={};
  await assert.rejects(service.upload(g.access,'experience',pending.uploadId,pending.ticket,interrupted));
  assert.equal((await service.status(g.access,'experience',pending.uploadId)).status,'failed');
  const next=await prepare(),stream=Readable.from([html]) as unknown as Request;stream.headers={};await service.upload(g.access,'experience',next.uploadId,next.ticket,stream);
  await app.get(MachineCredentialsService).revoke(access,g.id,{requestId:randomUUID()});
  await assert.rejects(service.complete(g.access,'experience',next.uploadId,next.ticket,{requestId:randomUUID()}));
  assert.equal((await fixture.runtime.client.projectOriginalFile.findUniqueOrThrow({where:{id:next.uploadId}})).status,'UPLOADED');
});
test('unknown 3D delivery can retain a real GLB and exact methods without claiming a runnable renderer or inventing assessment content',async()=>{
  const c=await fresh(true);await methods(c,'experience');
  const json=Buffer.from('{"asset":{"version":"2.0"}}'.padEnd(28,' ')),glb=Buffer.alloc(20+json.length);
  glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(json.length,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);
  const original=await upload(c,'experience',{type:'project_original',planModuleId:c.module('experience').id,outputKey:'web',fileKey:'source'},glb,'scene.glb','model/gltf-binary');
  await record(c,'experience',[{kind:'original_file',outputKey:'web',fileKey:'source',originalFileId:original.fileId,checksum:original.checksum}]);
  const saved=await save(c);assert.equal(saved.issues.length,0);const submitted=await reviews.transition(access,saved.id,'submit',action(saved));
  const retained=await reviews.transition(access,submitted.id,'retain',action(submitted));assert.equal(retained.archiveReady,true);
  assert.equal(retained.manifest.runtimeValidation,'not_performed');assert.equal(retained.manifest.content.length,0);assert.equal(retained.manifest.experiences.length,0);
  assert.equal(await fixture.runtime.client.productVersion.count({where:{productId:c.project.productId}}),0);
  assert.equal(hash(await bytes(await reviews.file(access,retained.id,'original',original.fileId))),hash(glb));
});
test('historical exact methods and their attachments survive later draft edits and archival without relying on source URLs',async()=>{
  const c=await complete(await fresh()),saved=await save(c),submitted=await reviews.transition(access,saved.id,'submit',action(saved)),
    retained=await reviews.transition(access,submitted.id,'retain',action(submitted));
  const fixed=retained.manifest.methods.find(m=>m.version.files.length)!,source=c.sources.find(s=>s.versionId===fixed.version.id)!,skills=app.get(SkillsService);
  const current=await skills.readVersion(access,'assessment',source.skillId,source.versionId);
  const changed=await skills.save(access,'assessment',source.skillId,source.versionId,{expectedRevision:current.revision,requestId:randomUUID(),
    manifest:{...current.manifest,instructions:current.manifest.instructions+'\n新的草稿方法，不替换旧项目。',references:[]}});
  await skills.transition(access,'assessment',source.skillId,source.versionId,'archive',{expectedRevision:changed.revision,requestId:randomUUID()});
  assert.deepEqual(await reviews.read(access,retained.id),retained);
  const ref=fixed.version.files[0]!.file;assert.equal(hash(await bytes(await reviews.file(access,retained.id,'method',ref.id))),ref.checksum);
  assert.equal(hash(await bytes(await reviews.file(access,retained.id,'original',c.originalId))),hash(html));
});
test('a real INSERT failure rolls back retention, links, audit and retry cache, and an identical retry succeeds after repair',async()=>{
  const c=await complete(await fresh()),saved=await save(c),submitted=await reviews.transition(access,saved.id,'submit',action(saved)),body=action(submitted);
  const before=await fixture.runtime.client.projectReviewRevision.count({where:{productId:c.project.productId}});
  await fixture.owner.client.$executeRaw(Prisma.sql`REVOKE INSERT ON orai.project_review_records FROM orai_app`);
  try{await assert.rejects(reviews.transition(access,submitted.id,'retain',body));}
  finally{await fixture.owner.client.$executeRaw(Prisma.sql`GRANT INSERT ON orai.project_review_records TO orai_app`);}
  assert.equal(await fixture.runtime.client.projectReviewRevision.count({where:{productId:c.project.productId}}),before);
  assert.equal(await fixture.runtime.client.adminAuditLog.count({where:{requestId:body.requestId}}),0);
  const retained=await reviews.transition(access,submitted.id,'retain',body);assert.equal(retained.status,'retained');
  assert.equal(await fixture.runtime.client.projectReviewRevision.count({where:{productId:c.project.productId}}),before+1);
});
function zip(name='index.html'){
  const filename=Buffer.from(name),body=html,local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22),crc=crc32(body);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(2048,6);local.writeUInt32LE(crc,14);
  local.writeUInt32LE(body.length,18);local.writeUInt32LE(body.length,22);local.writeUInt16LE(filename.length,26);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(2048,8);
  central.writeUInt32LE(crc,16);central.writeUInt32LE(body.length,20);central.writeUInt32LE(body.length,24);central.writeUInt16LE(filename.length,28);
  const file=Buffer.concat([local,filename,body]),directory=Buffer.concat([central,filename]);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(file.length,16);
  return Buffer.concat([file,directory,end]);
}
test('ZIP originals validate container bounds and safe members; malformed or encrypted packages remain failed imports',async()=>{
  const c=await fresh(),target={type:'project_original',planModuleId:c.module('experience').id,outputKey:'web',fileKey:'source'};
  const valid=zip(),imported=await upload(c,'experience',target,valid,'web.zip','application/zip');assert.equal(imported.status,'available');
  assert.equal(hash(await bytes(await app.get(ProjectOriginalFilesService).content(access,imported.fileId))),hash(valid));
  for(const bad of [zip('../outside.html'),valid.subarray(0,valid.length-1),Buffer.from('PK fake zip')]){
    const g=c.grants.experience,service=app.get(MachineUploadService),prepared=await service.prepare(g.access,g.token,'experience',{
      requestId:randomUUID(),target,fileName:'bad.zip',mimeType:'application/zip',byteSize:bad.length,checksum:hash(bad)});
    const stream=Readable.from([bad]) as unknown as Request;stream.headers={};await service.upload(g.access,'experience',prepared.uploadId,prepared.ticket,stream);
    await assert.rejects(service.complete(g.access,'experience',prepared.uploadId,prepared.ticket,{requestId:randomUUID()}));
    assert.equal((await service.status(g.access,'experience',prepared.uploadId)).status,'failed');
  }
  const unsafe=zip();unsafe.writeUInt16LE(2049,6);const central=30+Buffer.byteLength('index.html')+html.length;unsafe.writeUInt16LE(2049,central+8);
  const file=join(directory,'inspection-only.blob');await writeFile(file,unsafe);const handle=await open(file,'r');
  try{await assert.rejects(inspectOriginal(handle,unsafe.length,'application/zip'));}finally{await handle.close();}
  assert.equal(await readFile(join(directory,'outside.html')).then(()=>true,()=>false),false);
});
test('official MCP SDK streams and finalizes the same real project original over the existing bounded upload tools',async()=>{
  const c=await fresh(),g=c.grants.experience,filePath=join(directory,'sdk-web.html');await writeFile(filePath,html);
  const result=await promisify(execFile)(process.execPath,['../../packages/mcp/test/real-original-client.mjs'],{env:{...process.env,
    ORAI_MCP_API_URL:base,ORAI_MCP_TOKEN:g.token,ORAI_MCP_DOMAIN:'experience',ORAI_MCP_ALLOWED_ROOT:directory,
    ORAI_MCP_ORIGINAL_SCENARIO_JSON:JSON.stringify({filePath,mimeType:'text/html',target:{type:'project_original',planModuleId:c.module('experience').id,outputKey:'web',fileKey:'source'}})},maxBuffer:1_000_000});
  assert.equal(result.stderr,'');const checked=JSON.parse(result.stdout);assert.equal(checked.ok,true);assert.equal(checked.checksum,hash(html));
  const file=await fixture.runtime.client.projectOriginalFile.findUniqueOrThrow({where:{id:checked.fileId}});assert.equal(file.status,'AVAILABLE');
  assert.equal(await fixture.runtime.client.machineUpload.count({where:{originalFileId:file.id,credentialId:g.id}}),1);
});
