import {randomUUID,createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import type {Request} from 'express';
import {FilesService} from '../src/operations/files.service';
import {ProjectProductionService} from '../src/operations/project-production.service';
import type {INestApplication} from '@nestjs/common';
import {ProductionAttemptClaimedSchema,ProductionAttemptSchema,ProductionRunSchema,skillPurposes} from '@orai/contracts/admin';
import type {CatalogAdminAccess} from '../src/catalog/admin-access.service';
import {CatalogAdminAccessService} from '../src/catalog/admin-access.service';
import {CodexConnectionsService} from '../src/operations/codex-connections.service';
import {ProductionPlansService} from '../src/operations/production-plans.service';
import {ProductionRunsService} from '../src/operations/production-runs.service';
import type {createLocalFixture} from './local-fixture';
import {methodProject,captureMethod,assessmentInput} from './project-methods-fixture';
export async function runProject(app:INestApplication,fixture:Awaited<ReturnType<typeof createLocalFixture>>,access:CatalogAdminAccess,limits:Record<string,unknown>={},coverDependency=false){
 const base=await methodProject(app,fixture,access),plans=app.get(ProductionPlansService);
 const plan=await plans.save(access,base.boot.productId,{expectedRevision:base.plan.revision,requestId:randomUUID(),plan:{...base.plan.plan,modules:[...base.plan.plan.modules,
  {moduleKey:'video',title:'宣传视频',domain:'video',required:true,purpose:'原作业与接续隔离验证',dependsOn:coverDependency?['assessment','cover']:['assessment'],target:{form:'web',runtime:null},
   methodPurposes:['video_production'],methodRetention:'manifest_instructions_and_references',outputs:[{outputKey:'video',label:'视频原件',kind:'video',required:true,
    original:{storage:'platform',representation:'file'},files:[{fileKey:'source',label:'原件',purpose:'original',required:true,mimeTypes:['video/webm'],sourceUrl:null}]}]}]}});
 const c={...base,plan,boot:{...base.boot,planRevisionId:plan.id},module:(domain:string)=>plan.modules.find(m=>m.definition.domain===domain)!};
 const connections=app.get(CodexConnectionsService),input={name:'接续隔离连接',workspace:{kind:'existing' as const,id:c.connection.workspace.id},actions:{createProjects:true,useSkills:true,uploadDrafts:true},
  domains:['assessment','copy','cover','video','experience'].map(domain=>({domain,readSkills:true,uploadDrafts:true,skillIds:[]})),expiresAt:new Date(Date.now()+3600_000).toISOString()};
 const preview=await connections.preview(access,input),issued=await connections.create(access,{plan:preview.plan,expectedDigest:preview.digest,confirmed:true,clientKey:randomUUID(),requestId:randomUUID()});
 const grants=new Map<string,{access:CatalogAdminAccess;token:string}>();
 for(const secret of issued.secrets)grants.set(secret.domain,{token:secret.token,access:await app.get(CatalogAdminAccessService).authorizeMachine(secret.token,secret.domain)});
 const run=ProductionRunSchema.parse(await app.get(ProductionRunsService).execute(grants.get('assessment')!.access,grants.get('assessment')!.token,'production_run_create',{
  productId:c.boot.productId,planRevisionId:plan.id,expectedPlanDigest:plan.digest,runKey:'isolated-recovery-'+randomUUID(),limits:{maxAttemptsPerModule:5,maxTotalAttempts:30,maxConcurrency:6,
   maxDurationSeconds:3600,maxReportedCostFen:null,maxReportedTokens:null,...limits},requestId:randomUUID()}));
 const inputRecord=await assessmentInput(c),methods=new Map<string,{snapshotId:string;digest:string}[]>();
 const assessmentMethods=await fixture.runtime.client.projectMethodSnapshot.findMany({where:{planModuleId:c.module('assessment').id},select:{id:true,digest:true}});
 methods.set('assessment',assessmentMethods.map(m=>({snapshotId:m.id,digest:m.digest})));
 for(const domain of ['copy','video'] as const){const method=await captureMethod(c,domain,skillPurposes[domain][0]);methods.set(domain,[{snapshotId:method.snapshot.id,digest:method.snapshot.digest}]);}
 const records=new Map<string,typeof inputRecord.record>([['assessment',inputRecord.record]]);let coverFileId:string|null=null;
 if(coverDependency){const cover=await captureMethod(c,'cover');methods.set('cover',[{snapshotId:cover.snapshot.id,digest:cover.snapshot.digest}]);
  const files=app.get(FilesService),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1kAAAAASUVORK5CYII=','base64'),checksum=createHash('sha256').update(png).digest('hex');
  const upload=await files.prepare(access,{productVersionId:inputRecord.draft.productVersionId,kind:'cover',fileName:'source.png',mimeType:'image/png',byteSize:png.length,checksum,requestId:randomUUID()});
  await files.upload(access,upload.id,Readable.from([png]) as unknown as Request);const file=await files.complete(access,upload.id,{requestId:randomUUID()});coverFileId=file.id;
  records.set('cover',await app.get(ProjectProductionService).save(access,c.module('cover').id,{expectedModuleDigest:c.module('cover').digest,expectedRevision:0,requestId:randomUUID(),methods:methods.get('cover')!,inputs:[],
   outputs:[{kind:'file',outputKey:'cover',fileKey:'source',fileId:file.id,checksum}],external:{client:'isolated-test-fixture',runKey:'original-cover-'+randomUUID(),note:'原件验证样例，不是生成',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}}));
 }
 return {...c,run,grants,methods,inputRecord,records,coverFileId,recoveryConnection:issued.connection};
}
export type RunProject=Awaited<ReturnType<typeof runProject>>;
export async function runClaim(c:RunProject,domain:keyof typeof skillPurposes='video',extra:Record<string,unknown>={}){
 const grant=c.grants.get(domain)!;return ProductionAttemptClaimedSchema.parse(await c.app.get(ProductionRunsService).execute(grant.access,grant.token,'module_attempt_claim',{
  runId:c.run.id,planModuleId:c.module(domain).id,clientKey:'isolated-'+domain,methods:c.methods.get(domain)??[],inputs:c.module(domain).definition.dependsOn.flatMap(k=>{const r=c.records.get(k);return r?[{recordId:r.id,digest:r.digest}]:[];}),
  leaseSeconds:10,requestId:randomUUID(),...extra}));
}
export async function runEvent(c:RunProject,claim:ReturnType<typeof ProductionAttemptClaimedSchema.parse>,state='uploading',extra:Record<string,unknown>={}){
 const grant=c.grants.get(claim.attempt.domain)!;return ProductionAttemptSchema.parse(await c.app.get(ProductionRunsService).execute(grant.access,grant.token,'module_attempt_event',{
  attemptId:claim.attempt.id,leaseToken:claim.leaseToken,expectedRevision:claim.attempt.revision,requestId:randomUUID(),state,step:claim.attempt.domain==='video'?'S5':'S4',
  reasonCode:null,reason:'合成外部申报，不代表真实工具执行',job:{provider:'synthetic-render',jobId:'sample-job-024',terminal:false},reportedCostFen:null,reportedTokens:null,...extra}));
}
export function recoverySelection(c:RunProject,attempt:ReturnType<typeof ProductionAttemptSchema.parse>){return {expectedRevision:attempt.revision,expectedGeneration:attempt.generation,
 connectionId:c.recoveryConnection.id,consent:true as const,inputs:c.inputRecord.questions.slice(0,2).map(q=>({revisionId:c.inputRecord.draft.revisionId,digest:c.inputRecord.draft.digest,locator:{kind:'question' as const,questionId:q.id}}))};}
