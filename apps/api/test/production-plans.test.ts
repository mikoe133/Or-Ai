import 'reflect-metadata';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import {ProductionPlanDocumentSchema,CreativeProfileSchema,emptyProductImplementationPlan} from '@orai/contracts/admin';
import {AppModule} from '../src/app.module';
import {APP_CONFIG} from '../src/config/configuration';
import {configureApp} from '../src/common/configure-app';
import {CatalogAdminAccessService,type CatalogAdminAccess} from '../src/catalog/admin-access.service';
import {ProductionPlansService} from '../src/operations/production-plans.service';
import {ProjectCanvasService} from '../src/operations/project-canvas.service';
import {inspectProductionPlan} from '../src/operations/production-plan-inspection';
import {CatalogAdminService} from '../src/operations/catalog-admin.service';
import {ContentService} from '../src/operations/content.service';
import {SkillsService} from '../src/operations/skills.service';
import {ProjectProductionService} from '../src/operations/project-production.service';
import {VersionsService} from '../src/catalog/versions.service';
import {MachineCredentialsService} from '../src/operations/machine-credentials.service';
import {contentDigest} from '../src/operations/content-projections';
import {demoId,DemoIdentityScenarios} from '../scripts/demo-fixtures';
import {createLocalFixture} from './local-fixture';
import {Prisma} from '../src/generated/prisma/client';

let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,access:CatalogAdminAccess,service:ProductionPlansService,base:string;
before(async()=>{
  fixture=await createLocalFixture('t14');
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue(fixture.configuration).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
  access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);service=app.get(ProductionPlansService);
});
after(async()=>{await app?.close();await fixture?.close();});
async function fresh(){
  const catalog=app.get(CatalogAdminService),original=await catalog.product(access,demoId('demo-partner'));
  const keys=['slug','name','hook','summary','description','categoryId','tagIds','priceFen','durationMinutes','experienceType','themeKey','coverUrl','scope','recommended','publicSample','purchaseUrl','purchaseNotice','redemptionNotice'] as const;
  const product=await catalog.create(access,{...Object.fromEntries(keys.map(key=>[key,original[key]])),slug:'plan-'+randomUUID(),name:'制作计划 · 合成验收',requestId:randomUUID()});
  const profile=await app.get(ContentService).saveProfile(access,product.id,{expectedRevision:0,requestId:randomUUID(),profile:CreativeProfileSchema.parse({
    schemaVersion:1,title:'合成制作设定',audience:'自我观察者',situation:'日常沟通',emotionalGoal:'被理解',understandingGoal:'看见相处节奏',takeaway:'一个具体行动',
    perspective:'self',experienceForm:'web',pace:'从容',world:'共同的安静空间',language:'具体直接',visual:'紫色纸本',sound:'安静',
    reportPlan:{schemaVersion:1,title:'观察报告',narrative:'观察、解释、建议',presentation:'standard',sections:[{sectionId:'next',title:'下一步',purpose:'形成可尝试的行动'}]},
    channels:['manual'],deliverables:['assessment','cover','video','copy'],
  })});
  const file=(fileKey:string,purpose:'original'|'preview',mimeTypes:string[])=>({fileKey,purpose,label:fileKey,required:purpose==='original',mimeTypes,sourceUrl:null});
  const structured=(outputKey:string,kind:string)=>({outputKey,label:outputKey,required:true,kind,original:{storage:'platform',representation:'structured'},files:[]});
  const image=(outputKey:string)=>({outputKey,label:outputKey,required:true,kind:'image',original:{storage:'platform',representation:'file'},files:[file('source','original',['image/png']),file('preview','preview',['image/webp'])]});
  const module=(moduleKey:string,domain:string,methodPurposes:string[],outputs:unknown[],dependsOn:string[]=[])=>({moduleKey,title:moduleKey,domain,required:moduleKey!=='video',purpose:'合成流程验收',dependsOn,target:{form:'web',runtime:null},methodPurposes,methodRetention:'manifest_instructions_and_references',outputs});
  const plan=ProductionPlanDocumentSchema.parse({schemaVersion:1,title:'合成选题计划',creativeProfileRevisionId:profile.id,
    selection:{basis:'evidence',rationale:'仅作为合同/来源字段验收，不是真实热点',evidenceKeys:['domestic','international']},freshnessWindowHours:24,
    evidence:[{evidenceKey:'domestic',region:'domestic',language:'zh-CN',sourceName:'合成国内来源',sourceUrl:'https://domestic.example.test/article',publishedAt:null,retrievedAt:'2026-10-20T08:00:00Z',title:'合成线索 A',summary:'源发布时间未知'},
      {evidenceKey:'international',region:'international',language:'en',sourceName:'Synthetic international source',sourceUrl:'https://international.example.test/story',publishedAt:'2026-10-18T08:00:00Z',retrievedAt:'2026-10-20T08:00:00Z',title:'Synthetic story B',summary:'用于过期时间检查'}],
    modules:[module('assessment','assessment',['assessment_design','report_writing'],[structured('questions','assessment'),structured('report','report')]),
      module('images','cover',['cover_design'],[image('cover'),image('alternate-cover')]),module('copy','copy',['copywriting'],[structured('copy','copy')],['assessment']),
      {...module('experience','experience',['scene_design','report_presentation'],[{outputKey:'web-source',label:'网页原件',required:true,kind:'web_bundle',original:{storage:'platform',representation:'file'},files:[file('source','original',['application/zip'])]}],['assessment','images']),target:{form:'web',runtime:{renderer:{key:'dom-choice',version:1},reportRenderer:{key:'legacy-text',version:1},inputSchema:'single_choice_v1',engine:'dimensions_v1',reportSchema:'report_content_v1'}}},
      module('video','video',['video_production'],[{outputKey:'video',label:'视频原件',required:true,kind:'video',original:{storage:'platform',representation:'file'},files:[file('source','original',['video/webm'])]}],['copy','experience'])],
    retention:'platform_originals_and_exact_methods'});
  return {product,profile,plan};
}
const save=(value:Awaited<ReturnType<typeof fresh>>,revision=0)=>service.save(access,value.product.id,{plan:value.plan,expectedRevision:revision,requestId:randomUUID()});

test('v2 keeps pending Three.js decisions explicit and appends without rewriting legacy history',async()=>{
  const value=await fresh(),legacy=await save(value),productPlan=emptyProductImplementationPlan(legacy.id),
    plan={...value.plan,schemaVersion:2,productPlan},body={plan,expectedRevision:1,requestId:randomUUID()},
    result=await service.save(access,value.product.id,body);
  assert.equal(result.plan.schemaVersion,2);assert.deepEqual(result.plan,plan);
  assert.deepEqual(await service.save(access,value.product.id,body),result);
  assert.deepEqual(await service.read(access,legacy.id),legacy);
  assert.equal(result.modules[0]!.moduleId,legacy.modules[0]!.moduleId);
  const inspection=await service.inspection(access,result.id);
  assert.ok(inspection.issues.some(issue=>issue.code==='PRODUCT_PLAN_PENDING'));
  assert.equal(inspection.runtimeValidation,'not_performed');assert.equal(inspection.archiveReady,false);
});

test('v2 fixed origins and source IDs must belong to the same product and scope with the exact digest',async()=>{
  const value=await fresh(),other=await fresh(),otherPlan=await save(other);
  const plan={...value.plan,schemaVersion:2,productPlan:emptyProductImplementationPlan(otherPlan.id)};
  await assert.rejects(service.save(access,value.product.id,{plan,expectedRevision:0,requestId:randomUUID()}));
  plan.productPlan.basedOnPlanRevisionId=null;
  plan.productPlan.sources=[{sourceKey:'missing',moduleKey:'experience',kind:'experience_release',id:randomUUID(),digest:'a'.repeat(64)}];
  await assert.rejects(service.save(access,value.product.id,{plan,expectedRevision:0,requestId:randomUUID()}));
  await assert.rejects(service.validate(access,value.product.id,plan));
  assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:value.product.id}}),0);
});

test('v2 pins actual content and retained methods, rejects stale or foreign sources, and never treats sources as new captured output',async()=>{
  const value=await fresh(),legacy=await save(value),configuration=(await fixture.runtime.client.productVersion.findFirstOrThrow({where:{productId:demoId('demo-partner')}})).configuration,
    version=await app.get(VersionsService).importConfiguration(access,value.product.id,{configuration,requestId:randomUUID()}),
    content=await app.get(ContentService).saveAsset(access,{productVersionId:version.id,platform:'manual',variant:'contract',expectedRevision:0,requestId:randomUUID(),fileId:null,
      authoring:{schemaVersion:1,creativeProfileRevisionId:value.profile.id,content:{kind:'copy',blocks:[{blockId:'hook',role:'hook',text:'合成固定来源'}]},
        media:{localArchive:null,previewFileId:null},inputs:[],production:{source:'manual',batchKey:null,externalLabel:'合同验收',skillVersionId:null}}}),
    skill=await app.get(SkillsService).create(access,'copy',{slug:'contract-'+randomUUID(),requestId:randomUUID(),manifest:{schemaVersion:1,domain:'copy',name:'合成方法',description:'合同验收',
      purposes:['copywriting'],styles:['紫色'],supportedForms:['web'],inputs:[{key:'creative-profile',description:'设定',required:true}],outputs:[{key:'copy',description:'文案'}],instructions:'人工静态合同夹具。',examples:[],references:[]}}),
    module=legacy.modules.find(item=>item.moduleKey==='copy')!,method=await app.get(ProjectProductionService).capture(access,module.id,{
      expectedModuleDigest:module.digest,purpose:'copywriting',sourceVersionId:skill.id,expectedSourceRevision:skill.revision,expectedSourceDigest:skill.digest,requestId:randomUUID()}),
    productPlan=emptyProductImplementationPlan(legacy.id);
  productPlan.sources=[{sourceKey:'copy',moduleKey:'video',kind:'content_revision',id:content.id,digest:content.digest},
    {sourceKey:'method',moduleKey:'copy',kind:'method_snapshot',id:method.id,digest:method.digest}];
  const plan={...value.plan,schemaVersion:2,productPlan},saved=await service.save(access,value.product.id,{plan,expectedRevision:1,requestId:randomUUID()});
  assert.deepEqual(saved.plan,plan);
  assert.ok((await service.inspection(access,saved.id)).modules.every(item=>item.methods==='required_not_captured'));
  for(const source of [{...productPlan.sources[0]!,digest:'f'.repeat(64)},{...productPlan.sources[1]!,moduleKey:'video'}]){
    const candidate={...plan,productPlan:{...productPlan,sources:[source]}};
    await assert.rejects(service.save(access,value.product.id,{plan:candidate,expectedRevision:2,requestId:randomUUID()}));
  }
  const other=await fresh();
  await assert.rejects(service.save(access,other.product.id,{plan:{...plan,creativeProfileRevisionId:other.profile.id,productPlan:{...productPlan,basedOnPlanRevisionId:null}},expectedRevision:0,requestId:randomUUID()}));
  const profile2=await app.get(ContentService).saveProfile(access,value.product.id,{profile:{...value.profile.profile,world:'新的世界观'},expectedRevision:1,requestId:randomUUID()});
  await assert.rejects(service.save(access,value.product.id,{plan:{...plan,creativeProfileRevisionId:profile2.id},expectedRevision:2,requestId:randomUUID()}));
  assert.deepEqual(await service.read(access,saved.id),saved);assert.deepEqual(await service.read(access,legacy.id),legacy);
});

test('v2 can pin a retained release with its exact resource manifest without copying files',async()=>{
  const value=await fresh(),productId=demoId('demo-partner'),release=await fixture.runtime.client.experienceRelease.findFirstOrThrow({where:{productId}}),
    before=await fixture.runtime.client.experienceRelease.count({where:{productId}}),
    profile=await app.get(ContentService).saveProfile(access,productId,{profile:value.profile.profile,expectedRevision:0,requestId:randomUUID()}),productPlan=emptyProductImplementationPlan();
  productPlan.sources=[{sourceKey:'release',moduleKey:'video',kind:'experience_release',id:release.id,digest:release.digest}];
  const saved=await service.save(access,productId,{plan:{...value.plan,schemaVersion:2,creativeProfileRevisionId:profile.id,productPlan},expectedRevision:0,requestId:randomUUID()});
  assert.equal(saved.plan.schemaVersion,2);
  assert.equal(await fixture.runtime.client.experienceRelease.count({where:{productId}}),before);
});

test('database guards accept v2 only with Three.js and reject forged version/source data while preserving append-only runtime grants',async()=>{
  const value=await fresh(),legacy=await save(value),base={...value.plan,schemaVersion:2,productPlan:emptyProductImplementationPlan(legacy.id)};
  const bad=structuredClone(base);bad.productPlan.sources=[{sourceKey:'fake',moduleKey:'copy',kind:'content_revision',id:randomUUID(),digest:'f'.repeat(64)}];
  const {productPlan:_,...missing}=base;
  for(const document of [missing,{...base,schemaVersion:3},{...base,productPlan:{...base.productPlan,implementation:'html'}},bad])
    await assert.rejects(fixture.owner.client.productionPlanRevision.create({data:{productId:value.product.id,scope:'DEMO',number:2,
      creativeProfileRevisionId:value.profile.id,creativeProfileDigest:value.profile.digest,actorUserId:access.actorUserId,document,digest:contentDigest(document)}}));
  const saved=await service.save(access,value.product.id,{plan:base,expectedRevision:1,requestId:randomUUID()});
  await assert.rejects(fixture.runtime.client.productionPlanRevision.update({where:{id:saved.id},data:{digest:'b'.repeat(64)}}));
  await assert.rejects(fixture.owner.client.productionPlanRevision.delete({where:{id:saved.id}}));
  assert.deepEqual(await service.read(access,legacy.id),legacy);
});

test('plans retain domestic/international evidence, fixed profile, multiple image slots and optional modules without publishing or claiming imported originals',async()=>{
  const value=await fresh(),before=await fixture.runtime.client.product.findUniqueOrThrow({where:{id:value.product.id}}),first=await save(value);
  assert.equal(first.status,'planning_only');assert.deepEqual(first.plan,value.plan);assert.equal(first.creativeProfileDigest,value.profile.digest);
  assert.equal(first.plan.evidence[0]!.publishedAt,null);assert.equal(first.plan.modules[1]!.outputs.length,2);assert.equal(first.plan.modules.at(-1)!.required,false);
  const core=first.modules.find(module=>module.moduleKey==='assessment')!,experience=first.modules.find(module=>module.moduleKey==='experience')!;
  assert.ok(experience.dependencyIds.includes(core.moduleId));assert.deepEqual(await service.read(access,first.id),first);
  assert.deepEqual(await fixture.runtime.client.product.findUniqueOrThrow({where:{id:value.product.id}}),before);
  const inspection=await service.inspection(access,first.id);assert.equal(inspection.archiveReady,false);assert.equal(inspection.runtimeValidation,'not_performed');
  assert.ok(inspection.modules.every(module=>module.originals==='declared_not_imported'&&module.methods==='required_not_captured'));
});

test('plan revisions preserve stable module identities and immutable earlier definitions when names, dependencies or the chosen modules change',async()=>{
  const value=await fresh(),first=await save(value);value.plan.title='第二修订';value.plan.modules[0]!.title='更新后的模块标题';value.plan.modules.pop();
  const second=await save(value,1);assert.notEqual(second.id,first.id);assert.equal(second.revision,2);
  assert.equal(second.modules[0]!.moduleId,first.modules[0]!.moduleId);assert.notEqual(second.modules[0]!.id,first.modules[0]!.id);
  assert.deepEqual(await service.read(access,first.id),first);assert.equal((await service.list(access,value.product.id,{pageSize:1})).items[0]!.id,second.id);
  assert.equal((await service.list(access,value.product.id,{page:2,pageSize:1})).items[0]!.id,first.id);
  value.plan.modules[1]={...value.plan.modules[1]!,domain:'copy',methodPurposes:['copywriting'],outputs:[value.plan.modules[2]!.outputs[0]!]};
  assert.equal((await service.validate(access,value.product.id,value.plan)).valid,false);
  await assert.rejects(save(value,2));assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:value.product.id}}),2);
});

test('identical plan retries recover one object, changed request bodies conflict and concurrent writers append only one next revision',async()=>{
  const value=await fresh(),body={plan:value.plan,expectedRevision:0,requestId:randomUUID()},first=await service.save(access,value.product.id,body);
  assert.deepEqual(await service.save(access,value.product.id,body),first);
  await assert.rejects(service.save(access,value.product.id,{...body,plan:{...value.plan,title:'changed'}}));
  const writers=await Promise.allSettled(['writer-a','writer-b'].map(title=>service.save(access,value.product.id,{plan:{...value.plan,title},expectedRevision:1,requestId:randomUUID()})));
  assert.equal(writers.filter(result=>result.status==='fulfilled').length,1);assert.equal(writers.filter(result=>result.status==='rejected').length,1);
  assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:value.product.id}}),2);
  assert.equal(await fixture.runtime.client.productionModuleIdentity.count({where:{productId:value.product.id}}),value.plan.modules.length);
});

const canvasLayout=(key='assessment',x=420)=>({schemaVersion:1 as const,positions:[{nodeKey:'plan',x:0,y:100},{nodeKey:'module:'+key,x,y:120}]});
const canvas=()=>app.get(ProjectCanvasService);
test('a new plan and its initial canvas layout are saved atomically, while legacy saves stay compatible',async()=>{
  const value=await fresh(),plan=await service.save(access,value.product.id,{plan:value.plan,expectedRevision:0,requestId:randomUUID(),layout:canvasLayout(value.plan.modules[0]!.moduleKey)});
  const state=await canvas().read(access,plan.id);assert.equal(state.editable,true);assert.equal(state.latestPlanRevisionId,plan.id);
  assert.deepEqual(state.layout!.layout,canvasLayout(value.plan.modules[0]!.moduleKey));assert.equal(state.layout!.revision,1);
  const legacy=await fresh(),old=await save(legacy);assert.equal((await canvas().read(access,old.id)).layout,null);
});
test('layout-only changes append their own revisions without changing the plan digest, module identities or business versions',async()=>{
  const value=await fresh(),plan=await save(value),key=plan.modules[0]!.moduleKey,
    body={layout:canvasLayout(key),expectedRevision:0,expectedPlanDigest:plan.digest,requestId:randomUUID()},first=await canvas().save(access,plan.id,body);
  const second=await canvas().save(access,plan.id,{...body,layout:canvasLayout(key,800),expectedRevision:1,requestId:randomUUID()});
  assert.equal(second.revision,2);assert.deepEqual(await service.read(access,plan.id),plan);
  assert.deepEqual((await canvas().read(access,plan.id,{layoutRevisionId:first.id})).layout,first);
  assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:value.product.id}}),1);
  assert.equal(await fixture.runtime.client.productionModuleIdentity.count({where:{productId:value.product.id}}),plan.modules.length);
  assert.equal(await fixture.runtime.client.projectCanvasLayoutRevision.count({where:{planRevisionId:plan.id}}),2);
});
test('layout retries keep their identity and stale or concurrent writers cannot overwrite a saved layout',async()=>{
  const value=await fresh(),plan=await save(value),body={layout:canvasLayout(plan.modules[0]!.moduleKey),expectedRevision:0,expectedPlanDigest:plan.digest,requestId:randomUUID()},
    first=await canvas().save(access,plan.id,body);
  assert.deepEqual(await canvas().save(access,plan.id,body),first);
  await assert.rejects(canvas().save(access,plan.id,{...body,layout:canvasLayout(plan.modules[0]!.moduleKey,777)}));
  const results=await Promise.allSettled([600,900].map(x=>canvas().save(access,plan.id,{...body,expectedRevision:1,layout:canvasLayout(plan.modules[0]!.moduleKey,x),requestId:randomUUID()})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await canvas().read(access,plan.id)).layout!.revision,2);
});
test('new business revisions preserve stable identities and old layouts but make old plan editing read-only',async()=>{
  const value=await fresh(),first=await save(value),oldLayout=await canvas().save(access,first.id,{layout:canvasLayout(first.modules[0]!.moduleKey),expectedRevision:0,expectedPlanDigest:first.digest,requestId:randomUUID()});
  value.plan.modules.push({...structuredClone(value.plan.modules[2]!),moduleKey:'extra-copy',title:'另一个文案模块',dependsOn:[first.modules[0]!.moduleKey]});
  const second=await service.save(access,value.product.id,{plan:value.plan,expectedRevision:1,requestId:randomUUID(),layout:canvasLayout('extra-copy',1000)});
  assert.equal(second.modules[0]!.moduleId,first.modules[0]!.moduleId);assert.notEqual(second.modules[0]!.id,first.modules[0]!.id);
  const historical=await canvas().read(access,first.id);assert.equal(historical.editable,false);assert.equal(historical.latestPlanRevisionId,second.id);assert.deepEqual(historical.layout,oldLayout);
  await assert.rejects(canvas().save(access,first.id,{layout:canvasLayout(first.modules[0]!.moduleKey,1100),expectedRevision:1,expectedPlanDigest:first.digest,requestId:randomUUID()}));
  assert.deepEqual(await service.read(access,first.id),first);assert.equal((await canvas().read(access,second.id)).layout!.revision,1);
});
test('canvas layouts reject unknown or foreign nodes, invalid coordinates, duplicate nodes and forged digest without partial writes',async()=>{
  const value=await fresh(),plan=await save(value),body={layout:canvasLayout(plan.modules[0]!.moduleKey),expectedRevision:0,expectedPlanDigest:plan.digest,requestId:randomUUID()};
  for(const layout of [canvasLayout('missing'),{schemaVersion:1,positions:[{nodeKey:'method:'+randomUUID(),x:0,y:0}]},
    {schemaVersion:1,positions:[{nodeKey:'plan',x:100001,y:0}]},{schemaVersion:1,positions:[{nodeKey:'plan',x:0,y:0},{nodeKey:'plan',x:1,y:1}]}])
    await assert.rejects(canvas().save(access,plan.id,{...body,layout,requestId:randomUUID()}));
  await assert.rejects(canvas().save(access,plan.id,{...body,expectedPlanDigest:'f'.repeat(64)}));
  assert.equal(await fixture.runtime.client.projectCanvasLayoutRevision.count({where:{planRevisionId:plan.id}}),0);
  const other=await fresh(),otherPlan=await save(other),otherLayout=await canvas().save(access,otherPlan.id,{...body,expectedPlanDigest:otherPlan.digest,requestId:randomUUID()});
  await assert.rejects(canvas().read(access,plan.id,{layoutRevisionId:otherLayout.id}));
  await assert.rejects(canvas().read(access,plan.id,{unknown:true}));
});
test('failure saving an initial layout rolls back the new plan, new identities and the idempotent intent',async()=>{
  const value=await fresh(),first=await save(value),newModule={...structuredClone(value.plan.modules[2]!),moduleKey:'rollback-copy',title:'回滚模块'};
  const plan={...value.plan,modules:[...value.plan.modules,newModule]},body={plan,expectedRevision:1,requestId:randomUUID(),layout:canvasLayout('rollback-copy')};
  await fixture.owner.client.$executeRawUnsafe(`CREATE FUNCTION orai.fail_canvas_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected layout write failure'; END $$`);
  await fixture.owner.client.$executeRawUnsafe(`CREATE TRIGGER canvas_insert_failure BEFORE INSERT ON orai.project_canvas_layout_revisions FOR EACH ROW EXECUTE FUNCTION orai.fail_canvas_insert()`);
  try {await assert.rejects(service.save(access,value.product.id,body));}
  finally {await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER canvas_insert_failure ON orai.project_canvas_layout_revisions');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.fail_canvas_insert()');}
  assert.deepEqual(await service.read(access,first.id),first);assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:value.product.id}}),1);
  assert.equal(await fixture.runtime.client.productionModuleIdentity.count({where:{productId:value.product.id,moduleKey:'rollback-copy'}}),0);
  assert.equal((await service.save(access,value.product.id,body)).revision,2);
});
test('canvas state and layout mutation require current human admin authority and keep HTTP routes private',async()=>{
  const value=await fresh(),plan=await save(value),forged={actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess;
  await assert.rejects(canvas().read(forged,plan.id));await assert.rejects(canvas().save(forged,plan.id,{layout:canvasLayout(),expectedRevision:0,expectedPlanDigest:plan.digest,requestId:randomUUID()}));
  assert.equal((await fetch(base+'/api/admin/production-plans/'+plan.id+'/canvas-layout')).status,401);
  assert.equal((await fetch(base+'/api/admin/production-plans/'+plan.id+'/canvas-layout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})})).status,403);
  assert.equal((await fetch(base+'/api/production-plans/'+plan.id+'/canvas-layout')).status,404);
});
test('database layout history is append-only and rejects direct foreign nodes, wrong scopes and nonsequential revisions',async()=>{
  const value=await fresh(),plan=await save(value),first=await canvas().save(access,plan.id,{layout:canvasLayout(plan.modules[0]!.moduleKey),expectedRevision:0,expectedPlanDigest:plan.digest,requestId:randomUUID()});
  await assert.rejects(fixture.owner.client.projectCanvasLayoutRevision.update({where:{id:first.id},data:{document:canvasLayout('foreign')}}));
  await assert.rejects(fixture.owner.client.projectCanvasLayoutRevision.delete({where:{id:first.id}}));
  for(const data of [{number:3,scope:'DEMO' as const,document:canvasLayout(plan.modules[0]!.moduleKey)},
    {number:2,scope:'LIVE' as const,document:canvasLayout(plan.modules[0]!.moduleKey)},
    {number:2,scope:'DEMO' as const,document:canvasLayout('foreign')}])await assert.rejects(fixture.owner.client.projectCanvasLayoutRevision.create({data:{
      planRevisionId:plan.id,productId:value.product.id,actorUserId:access.actorUserId,digest:'a'.repeat(64),...data}}));
  assert.deepEqual((await canvas().read(access,plan.id)).layout,first);
});

test('freshness distinguishes unknown source dates, stale publications and future retrieval without rewriting the fixed evidence',async()=>{
  const value=await fresh(),first=await save(value),inspection=inspectProductionPlan(first.plan,new Date('2026-10-21T08:00:00Z'));
  assert.equal(inspection.evidence[0]!.publicationTime,'unknown');assert.equal(inspection.evidence[0]!.retrievalTime,'fresh');
  assert.equal(inspection.evidence[1]!.publicationTime,'stale');assert.equal(inspection.valid,true);
  const future=structuredClone(first.plan);future.evidence[0]!.retrievedAt='2026-10-22T08:00:00Z';assert.equal(inspectProductionPlan(future,new Date('2026-10-21T08:00:00Z')).evidence[0]!.retrievalTime,'future_dated');
  assert.deepEqual((await service.read(access,first.id)).plan.evidence,value.plan.evidence);
});

test('dependency cycles, unknown references, preview-only originals, external-only storage and fake success fields cannot be saved',async()=>{
  const value=await fresh();
  for(const failure of ['cycle','unknown','evidence','preview','external','success','method','mime']){
    const plan:Record<string,any>=structuredClone(value.plan);
    if(failure==='cycle')plan.modules[0].dependsOn=['video'];
    if(failure==='unknown')plan.modules[3].dependsOn=['missing'];
    if(failure==='evidence')plan.selection.evidenceKeys=['missing'];
    if(failure==='preview')plan.modules[1].outputs[0].files=plan.modules[1].outputs[0].files.filter((file:{purpose:string})=>file.purpose==='preview');
    if(failure==='external')plan.modules[1].outputs[0].original.storage='external';
    if(failure==='success')plan.modules[1].outputs[0].files[0].status='available';
    if(failure==='method')plan.modules[1].methodPurposes=['video_production'];
    if(failure==='mime')plan.modules[1].outputs[0].files[0].mimeTypes=['text/html'];
    assert.equal((await service.validate(access,value.product.id,plan)).valid,false,failure);await assert.rejects(service.save(access,value.product.id,{plan,expectedRevision:0,requestId:randomUUID()}));
  }
  assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:value.product.id}}),0);
});

test('unsupported web/3D plans can be retained as plans but neither form labels nor a registered pair claim runnable or archived delivery',async()=>{
  const value=await fresh(),supported=await service.validate(access,value.product.id,value.plan);
  assert.equal(supported.modules[3]!.template,'registered_pair');assert.equal(supported.runtimeValidation,'not_performed');
  value.plan.modules[3]!.target.form='3d';value.plan.modules[3]!.target.runtime!.renderer={key:'unknown-scene',version:1};
  const first=await save(value),inspection=await service.inspection(access,first.id);
  assert.equal(inspection.modules[3]!.template,'unregistered');assert.equal(inspection.archiveReady,false);
  assert.ok(inspection.issues.some(issue=>issue.code==='UNREGISTERED_RUNTIME'));
});

test('scope, fixed profile, admin authority and existing machine credentials cannot bypass project planning boundaries',async()=>{
  const value=await fresh(),other=await fresh(),first=await save(value);
  await assert.rejects(service.save(access,value.product.id,{plan:{...value.plan,creativeProfileRevisionId:other.profile.id},expectedRevision:1,requestId:randomUUID()}));
  await assert.rejects(service.list(access,value.product.id,{scope:'live'}));await assert.rejects(service.read({actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess,first.id));
  const user=await fixture.owner.client.user.create({data:{supabaseUserId:randomUUID(),scope:'LIVE',role:'USER'}});
  await fixture.owner.client.user.update({where:{id:user.id},data:{role:'ADMIN'}});
  await assert.rejects(app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,user.id));
  const original=await fixture.owner.client.product.findUniqueOrThrow({where:{id:value.product.id}});
  const {id:_id,createdAt:_created,updatedAt:_updated,currentVersionId:_current,...metadata}=original;
  const livePlan=await fixture.owner.client.$transaction(async tx=>{
    const product=await tx.product.create({data:{...metadata,scope:'LIVE',slug:'live-plan-'+randomUUID(),publicSample:{...(original.publicSample as object),isDemo:false}}});
    const profile=await tx.creativeProfileRevision.create({data:{productId:product.id,scope:'LIVE',number:1,profile:value.profile.profile,digest:value.profile.digest}});
    const document={...value.plan,creativeProfileRevisionId:profile.id};
    const plan=await tx.productionPlanRevision.create({data:{productId:product.id,scope:'LIVE',number:1,creativeProfileRevisionId:profile.id,creativeProfileDigest:profile.digest,
      actorUserId:user.id,document,digest:contentDigest(document)}});
    for(const [position,definition] of document.modules.entries()){
      const identity=await tx.productionModuleIdentity.create({data:{productId:product.id,scope:'LIVE',moduleKey:definition.moduleKey,domain:definition.domain}});
      await tx.productionPlanModule.create({data:{planRevisionId:plan.id,moduleId:identity.id,productId:product.id,scope:'LIVE',position,definition:definition as Prisma.InputJsonValue,digest:contentDigest(definition)}});
    }
    return plan;
  });
  await assert.rejects(service.read(access,livePlan.id));
  await assert.rejects(canvas().read(access,livePlan.id));
  const issued=await app.get(MachineCredentialsService).create(access,{name:'P1 old credential',domain:'cover',productIds:[value.product.id],skillIds:[],permissions:['content:read','content:write'],expiresAt:new Date(Date.now()+3600000).toISOString(),requestId:randomUUID()});
  const machine=await app.get(CatalogAdminAccessService).authorizeMachine(issued.token!,'cover');await assert.rejects(service.read(machine,first.id));await assert.rejects(canvas().read(machine,first.id));
  await app.get(MachineCredentialsService).revoke(access,issued.credential.id,{requestId:randomUUID()});
  assert.equal((await fetch(base+'/api/production-plans/'+first.id)).status,404);
  assert.equal((await fetch(base+'/api/admin/production-plans/'+first.id)).status,401);
});

test('database constraints protect immutable identities, fixed module snapshots, completeness and same-project relations',async()=>{
  const value=await fresh(),first=await save(value),other=await fresh(),second=await save(other);
  await assert.rejects(fixture.owner.client.productionPlanRevision.update({where:{id:first.id},data:{digest:'f'.repeat(64)}}));
  await assert.rejects(fixture.owner.client.productionModuleIdentity.update({where:{id:first.modules[0]!.moduleId},data:{domain:'video'}}));
  await assert.rejects(fixture.owner.client.productionPlanModule.update({where:{id:first.modules[0]!.id},data:{definition:{}}}));
  await assert.rejects(fixture.runtime.client.productionPlanRevision.delete({where:{id:first.id}}));
  await assert.rejects(fixture.owner.client.productionPlanRevision.create({data:{productId:value.product.id,scope:'DEMO',number:2,creativeProfileRevisionId:value.profile.id,creativeProfileDigest:value.profile.digest,
    actorUserId:access.actorUserId,document:value.plan,digest:contentDigest(value.plan)}}));
  await assert.rejects(fixture.owner.client.productionPlanModule.create({data:{planRevisionId:first.id,moduleId:second.modules[0]!.moduleId,productId:value.product.id,scope:'DEMO',position:0,
    definition:value.plan.modules[0]!,digest:contentDigest(value.plan.modules[0])}}));
  const cyclic=structuredClone(value.plan);cyclic.modules[0]!.dependsOn=['video'];
  await assert.rejects(fixture.owner.client.$transaction(async tx=>{
    const plan=await tx.productionPlanRevision.create({data:{productId:value.product.id,scope:'DEMO',number:2,creativeProfileRevisionId:value.profile.id,creativeProfileDigest:value.profile.digest,
      actorUserId:access.actorUserId,document:cyclic,digest:contentDigest(cyclic)}});
    for(const [position,definition] of cyclic.modules.entries())await tx.productionPlanModule.create({data:{planRevisionId:plan.id,moduleId:first.modules[position]!.moduleId,
      productId:value.product.id,scope:'DEMO',position,definition,digest:contentDigest(definition)}});
  }));
  assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:value.product.id}}),1);assert.deepEqual(await service.read(access,first.id),first);
});
