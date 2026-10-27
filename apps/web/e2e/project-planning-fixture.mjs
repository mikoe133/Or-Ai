import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';

// Static business fixtures only. Existing real Auth accounts are used by the browser runner.
// No MCP credentials, model execution, media generation or product publication.
export async function planningFixture({app,fixture,root,title='项目规划功能验收',count=5,empty=false,withRecord=true}){
  const require=createRequire(join(root,'apps/api/package.json')),{AdminProductInputSchema,skillPurposes}=require('@orai/contracts/admin'),
    {demoId,DemoIdentityScenarios}=require('./.test-build/scripts/demo-fixtures.js'),
    {CatalogAdminAccessService}=require('./.test-build/src/catalog/admin-access.service.js');
  const names=['CatalogAdminService','ContentService','VersionsService','ProductionPlansService','SkillsService','ProjectProductionService','ProjectReviewService','ProjectCanvasService'];
  const service=name=>{const area=name==='VersionsService'?'catalog':'operations',file=name.replace(/[A-Z]/g,(m,i)=>(i?'-':'')+m.toLowerCase()).replace(/-service$/,'.service');
    return app.get(require('./.test-build/src/'+area+'/'+file+'.js')[name]);};
  const services=Object.fromEntries(names.map(name=>[name,service(name)])),access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id),
    original=await services.CatalogAdminService.product(access,demoId('demo-partner')),
    product=await services.CatalogAdminService.create(access,{...AdminProductInputSchema.strip().parse(original),slug:'planning-'+randomUUID(),name:title,requestId:randomUUID()}),
    profile=await services.ContentService.saveProfile(access,product.id,{expectedRevision:0,requestId:randomUUID(),profile:{schemaVersion:1,title:'功能验收固定设定',audience:'本地测试操作者',situation:'验证规划保存',
      emotionalGoal:'验证既有字段',understandingGoal:'验证业务关系',takeaway:'核对保存结果',perspective:'self',experienceForm:'web',pace:'静态',world:'本地功能样例',language:'功能预置文本',visual:'紫色',sound:'安静',channels:['manual'],
      deliverables:['assessment','cover','copy','video'],reportPlan:{schemaVersion:1,title:'功能报告结构',narrative:'只用于结构测试',presentation:'standard',sections:[{sectionId:'next',title:'下一步',purpose:'验证结构'}]}}});
  if(empty)return {product,profile,access,services};
  const definitions=[['assessment','题目与报告','assessment',[]],['copy','引流文案','copy',[]],['cover','宣传封面','image',[]],['experience','网页体验','web_bundle',['assessment','cover']],['video','宣传视频','video',['copy']]];
  const modules=(count===40?Array.from({length:40},(_,i)=>['module-'+String(i+1).padStart(2,'0'),'规划模块 '+String(i+1).padStart(2,'0'),'copy',i?['module-'+String(i).padStart(2,'0')]:[]]):definitions).map(([key,label,kind,dependsOn])=>{
    const domain=count===40?'copy':key,native=['assessment','copy'].includes(kind),mime=kind==='image'?'image/png':kind==='video'?'video/webm':'text/html';
    return {moduleKey:key,title:label,domain,required:true,purpose:'静态规划功能测试',dependsOn,target:{form:'web',runtime:null},methodPurposes:[...skillPurposes[domain]],methodRetention:'manifest_instructions_and_references',
      outputs:[{outputKey:domain==='copy'?'copy':'main',label:'交付原件',kind,required:true,original:{storage:'platform',representation:native?'structured':'file'},
        files:native?[]:[{fileKey:'source',purpose:'original',label:'原件',required:true,mimeTypes:[mime],sourceUrl:null}]}]};
  });
  const plan=await services.ProductionPlansService.save(access,product.id,{expectedRevision:0,requestId:randomUUID(),plan:{schemaVersion:1,title:title+'制作计划',creativeProfileRevisionId:profile.id,
    selection:{basis:'manual',rationale:'仅验证平台业务，不制作或评价商品内容。',evidenceKeys:[]},freshnessWindowHours:24,evidence:[],modules,retention:'platform_originals_and_exact_methods'}});
  let method,record,review;
  if(withRecord){
    const source=await fixture.runtime.client.productVersion.findFirstOrThrow({where:{productId:original.id,status:'PUBLISHED'}}),version=await services.VersionsService.importConfiguration(access,product.id,{configuration:source.configuration,requestId:randomUUID()}),
      skill=await services.SkillsService.create(access,'copy',{slug:'planning-method-'+randomUUID(),requestId:randomUUID(),manifest:{schemaVersion:1,domain:'copy',name:'静态功能方法',description:'只用于固定引用测试',
        purposes:['copywriting'],styles:['紫色'],supportedForms:['web'],inputs:[{key:'creative-profile',description:'固定设定',required:true}],outputs:[{key:'copy',description:'原稿'}],instructions:'静态人工预置正文，用于验证引用只读；未调用模型。',examples:[],references:[]}}),
      module=plan.modules.find(m=>m.moduleKey==='copy');
    method=await services.ProjectProductionService.capture(access,module.id,{expectedModuleDigest:module.digest,purpose:'copywriting',sourceVersionId:skill.id,expectedSourceRevision:skill.revision,expectedSourceDigest:skill.digest,requestId:randomUUID()});
    const content=await services.ContentService.saveAsset(access,{productVersionId:version.id,platform:'manual',variant:'fixture',expectedRevision:0,requestId:randomUUID(),fileId:null,
      authoring:{schemaVersion:1,creativeProfileRevisionId:profile.id,content:{kind:'copy',blocks:[{blockId:'hook',role:'hook',text:'人工预置的原稿，仅验证旧版本保持不变。'}]},
        media:{localArchive:null,previewFileId:null},inputs:[],production:{source:'manual',batchKey:null,externalLabel:'静态功能数据，未生成内容',skillVersionId:null}}});
    record=await services.ProjectProductionService.save(access,module.id,{expectedModuleDigest:module.digest,expectedRevision:0,requestId:randomUUID(),methods:[{snapshotId:method.id,digest:method.digest}],inputs:[],
      outputs:[{kind:'content_revision',outputKey:'copy',revisionId:content.id,digest:content.digest}],external:{client:'static-ui-fixture',runKey:'manual-'+randomUUID(),note:'人工静态预置，非模型执行',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}});
    review=await services.ProjectReviewService.save(access,product.id,{selection:{planRevisionId:plan.id,records:[{recordId:record.id,digest:record.digest}]},expectedRevision:0,note:'规划编辑前的固定部分审核稿，缺项未留存。',requestId:randomUUID()});
  }
  return {product,profile,plan,method,record,review,access,services};
}
