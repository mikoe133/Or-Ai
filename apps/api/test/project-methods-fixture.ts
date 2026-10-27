import {randomUUID} from 'node:crypto';
import type {INestApplication} from '@nestjs/common';
import {CreativeProfileSchema,ProductionPlanDocumentSchema,StyleSkillManifestSchema,skillPurposes} from '@orai/contracts/admin';
import {CatalogAdminAccessService,type CatalogAdminAccess} from '../src/catalog/admin-access.service';
import {CatalogAdminService} from '../src/operations/catalog-admin.service';
import {CodexConnectionsService} from '../src/operations/codex-connections.service';
import {MachineProjectsService} from '../src/operations/machine-projects.service';
import {ProductionPlansService} from '../src/operations/production-plans.service';
import {ProjectMethodOperationsService} from '../src/operations/project-method-operations.service';
import {ProjectProductionService} from '../src/operations/project-production.service';
import {SkillsService} from '../src/operations/skills.service';
import {demoId} from '../scripts/demo-fixtures';
import type {createLocalFixture} from './local-fixture';

export function methodManifest(domain:keyof typeof skillPurposes){return StyleSkillManifestSchema.parse({schemaVersion:1,domain,name:'日常观察方法 · '+domain,
 description:'隔离功能样例，不代表正式商品内容',purposes:[...skillPurposes[domain]],styles:['精密工具紫'],supportedForms:['web'],
 inputs:[{key:'creative-profile',description:'固定共同设定',required:true}],outputs:[{key:'deliverable',description:'本领域交付'}],
 instructions:'用一个具体日常观察提出开放问题；保留用户自己的解释空间。',examples:[],references:[]});}
export async function methodProject(app:INestApplication,fixture:Awaited<ReturnType<typeof createLocalFixture>>,access:CatalogAdminAccess,coverDependency=false){
 const catalog=app.get(CatalogAdminService),connections=app.get(CodexConnectionsService),projects=app.get(MachineProjectsService),admins=app.get(CatalogAdminAccessService);
 const original=await catalog.product(access,demoId('demo-partner'));
 const plan={name:'隔离商品制作连接',workspace:{kind:'new' as const,categoryIds:[original.categoryId],maxProjects:20,maxMethodsPerProject:30,maxRunsPerProject:20},
  actions:{createProjects:true,useSkills:true,uploadDrafts:true},domains:['assessment','copy','cover','video','experience'].map(domain=>({domain,readSkills:true,uploadDrafts:true,skillIds:[]})),expiresAt:new Date(Date.now()+7200_000).toISOString()};
 const preview=await connections.preview(access,plan),issued=await connections.create(access,{plan:preview.plan,expectedDigest:preview.digest,confirmed:true,clientKey:randomUUID(),requestId:randomUUID()});
 const machine=new Map<string,CatalogAdminAccess>();for(const secret of issued.secrets)machine.set(secret.domain,await admins.authorizeMachine(secret.token,secret.domain));
 const profile=CreativeProfileSchema.parse({schemaVersion:1,title:'隔离关系探索',audience:'日常沟通的参与者',situation:'想说却没说出口',emotionalGoal:'被理解',understandingGoal:'看见表达习惯',
  takeaway:'一个能继续聊下去的具体线索',perspective:'self',experienceForm:'web',pace:'从容',world:'紫色纸本',language:'具体温和',visual:'克制紫色',sound:'安静',channels:['manual'],
  deliverables:['assessment','copy','cover','video'],reportPlan:{schemaVersion:1,title:'观察与下一步',narrative:'事实和开放建议',presentation:'standard',sections:[{sectionId:'next',title:'下一步',purpose:'具体行动'}]}});
 const output=(outputKey:string,kind:string)=>({outputKey,label:outputKey,kind,required:true,original:{storage:'platform',representation:kind==='image'?'file':'structured'},
  files:kind==='image'?[{fileKey:'source',label:'原件',purpose:'original',required:true,mimeTypes:['image/png'],sourceUrl:null}]:[]});
 const module=(domain:keyof typeof skillPurposes,outputs:unknown[],dependsOn:string[]=[])=>({moduleKey:domain,title:({assessment:'题目与报告',copy:'引流文案',cover:'封面图片',video:'宣传视频',experience:'网页体验'})[domain],domain,
  required:true,purpose:'隔离制作交接',dependsOn,target:{form:'web',runtime:null},methodPurposes:[...skillPurposes[domain]],methodRetention:'manifest_instructions_and_references',outputs});
 const {isDemo:_,...publicSample}=original.publicSample;
 const boot=await projects.execute(machine.get('assessment')!,'project_bootstrap',{projectKey:'method-project-'+randomUUID(),requestId:randomUUID(),
  product:{slug:'method-project-'+randomUUID(),name:'把话说开之前 · 隔离样例',hook:'看见自己的表达',summary:'仅用于隔离功能验收',description:'不是正式销售内容',categoryId:original.categoryId,
   priceFen:0,durationMinutes:5,experienceType:original.experienceType,themeKey:original.themeKey,publicSample},profile,
  plan:{schemaVersion:1,title:'关系表达制作计划',selection:{basis:'manual',rationale:'隔离交接验证',evidenceKeys:[]},freshnessWindowHours:24,evidence:[],
   modules:[module('assessment',[output('questions','assessment'),output('report','report')]),module('copy',[output('copy','copy')],coverDependency?['assessment','cover']:['assessment']),module('cover',[output('cover','image')])],retention:'platform_originals_and_exact_methods'}}) as {productId:string;planRevisionId:string;creativeProfileRevisionId:string};
 const fixed=await app.get(ProductionPlansService).read(access,boot.planRevisionId);
 return {app,fixture,access,connection:issued.connection,machine,boot,plan:fixed,module:(domain:string)=>fixed.modules.find(m=>m.definition.domain===domain)!};
}
export type MethodProject=Awaited<ReturnType<typeof methodProject>>;
export async function captureMethod(c:MethodProject,domain:keyof typeof skillPurposes,purpose:string=skillPurposes[domain][0]){
 const source=await c.app.get(SkillsService).create(c.access,domain,{slug:'method-base-'+randomUUID(),manifest:methodManifest(domain),requestId:randomUUID()});
 const body={expectedModuleDigest:c.module(domain).digest,purpose,sourceVersionId:source.id,expectedSourceRevision:source.revision,expectedSourceDigest:source.digest,
  customization:{parameters:{audience:'日常沟通的参与者','sentence-limit':3},instructions:'使用具体观察，避免贴标签。'},requestId:randomUUID()};
 const snapshot=await c.app.get(ProjectMethodOperationsService).capture(c.access,c.module(domain).id,body);
 return {source,body,snapshot};
}
export async function assessmentInput(c:MethodProject,partial=false){
 const methods=[];for(const purpose of skillPurposes.assessment)methods.push((await captureMethod(c,'assessment',purpose)).snapshot);
 const config=await c.fixture.runtime.client.productVersion.findFirstOrThrow({where:{productId:demoId('demo-partner'),status:'PUBLISHED'}});
 const draft=await c.app.get(MachineProjectsService).execute(c.machine.get('assessment')!,'project_draft_save',{
  planModuleId:c.module('assessment').id,expectedModuleDigest:c.module('assessment').digest,requestId:randomUUID(),methods:methods.map(m=>({snapshotId:m.id,digest:m.digest})),
  payload:{kind:'assessment',expectedRevision:0,configuration:config.configuration}}) as {revisionId:string;digest:string;productVersionId:string};
 const record=await c.app.get(ProjectProductionService).save(c.access,c.module('assessment').id,{expectedModuleDigest:c.module('assessment').digest,expectedRevision:0,requestId:randomUUID(),
  methods:methods.map(m=>({snapshotId:m.id,digest:m.digest})),inputs:[],outputs:(partial?['questions']:['questions','report']).map(outputKey=>({kind:'content_revision',outputKey,revisionId:draft.revisionId,digest:draft.digest})),
  external:{client:'isolated-test-fixture',runKey:'fixture-'+randomUUID(),note:'人工预置测试替身，不是内容生产',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}});
 const questions=(config.configuration as {questions:{id:string;text:string}[]}).questions;
 return {draft,record,questions};
}
