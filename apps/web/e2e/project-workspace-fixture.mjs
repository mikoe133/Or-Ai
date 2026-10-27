import {createRequire} from 'node:module';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {Readable} from 'node:stream';

// Actual business services and real files in a disposable database. No generation or publication.
export async function projectWorkspaceFixture({app,fixture,root}){
  const require=createRequire(join(root,'apps/api/package.json')),{skillPurposes,AdminProductInputSchema}=require('@orai/contracts/admin'),
    {demoId,DemoIdentityScenarios}=require('./.test-build/scripts/demo-fixtures.js'),
    {CatalogAdminAccessService}=require('./.test-build/src/catalog/admin-access.service.js'),
    {defaultExperience}=require('./.test-build/src/catalog/experience-authoring.js');
  const services=Object.fromEntries(['CatalogAdminService','ContentService','ProductionPlansService','ProjectProductionService','MachineProjectsService','MachineCredentialsService',
    'MachineUploadService','SkillsService','ProductionRunsService','ProjectReviewService'].map(name=>{const file=name.replace(/[A-Z]/g,(m,i)=>(i?'-':'')+m.toLowerCase()).replace(/-service$/,'.service');return [name,app.get(require('./.test-build/src/operations/'+file+'.js')[name])];}));
  const admins=app.get(CatalogAdminAccessService),access=await admins.authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id),projects=services.MachineProjectsService,
    original=await services.CatalogAdminService.product(access,demoId('demo-partner')),workspace=await projects.createWorkspace(access,{name:'G4 本地界面验收',categoryIds:[original.categoryId],maxProjects:1,maxMethodsPerProject:10,
      expiresAt:new Date(Date.now()+7200_000).toISOString(),requestId:randomUUID()}),grants={};
  for(const domain of Object.keys(skillPurposes)){
    const issued=await services.MachineCredentialsService.create(access,{name:'G4 隔离领域连接',domain,workspaceId:workspace.id,
      permissions:['content:read','content:write','skills:read','skills:write','context:read','projects:read','methods:create',...(domain==='assessment'?['projects:create','projects:write']:[])],
      productIds:[],skillIds:[],expiresAt:new Date(Date.now()+3600_000).toISOString(),requestId:randomUUID()});
    grants[domain]={token:issued.token,access:await admins.authorizeMachine(issued.token,domain)};
  }
  const profile={schemaVersion:1,title:'相处节奏观察 · 项目设定',audience:'想理解自己与亲密关系的人',situation:'交流节奏不一致',emotionalGoal:'被看见，也理解对方',
    understandingGoal:'辨认独处、靠近与表达的节奏',takeaway:'选择一句更容易说出口的话',perspective:'self',experienceForm:'web',pace:'安静、留白',world:'日常生活的具体片段',
    language:'具体、温和、没有评判',visual:'紫色、克制',sound:'安静',channels:['manual'],deliverables:['assessment','cover','copy','video'],
    reportPlan:{schemaVersion:1,title:'我的相处节奏',narrative:'观察、理解、表达',presentation:'standard',sections:[{sectionId:'next',title:'下一次可以试试',purpose:'一个具体的沟通动作'}]}};
  const output=(outputKey,kind,label,mime)=>({outputKey,kind,label,required:true,original:{storage:'platform',representation:mime?'file':'structured'},
    files:mime?[{fileKey:'source',purpose:'original',label:'制作原件',required:true,mimeTypes:[mime],sourceUrl:mime==='text/html'?'https://expired.example.test/original':null}]:[]});
  const definitions=[['assessment','题目与报告',[output('questions','assessment','题目原文'),output('report','report','报告结构')],[]],
    ['cover','宣传封面',[output('cover','image','宣传封面','image/png')],[]],['copy','引流文案',[output('copy','copy','文案原文')],['assessment']],
    ['experience','网页体验',[output('web','web_bundle','网页原件','text/html')],['assessment','cover']],
    ['video','宣传视频',[output('video','video','视频成片','video/webm')],['assessment','copy','experience']]];
  const {isDemo:_,...publicSample}=original.publicSample;
  const project=await projects.execute(grants.assessment.access,'project_bootstrap',{requestId:randomUUID(),projectKey:'g4-'+randomUUID(),
    product:{slug:'g4-'+randomUUID(),name:'相处节奏观察 · 界面验收样例',hook:'你的靠近，有自己的节奏',summary:'仅用于本地项目工作台技术验收',description:'隔离数据库内的合成样例，不上架。',
      categoryId:original.categoryId,priceFen:original.priceFen,durationMinutes:5,experienceType:original.experienceType,themeKey:original.themeKey,publicSample},profile,
    plan:{schemaVersion:1,title:'相处节奏观察 · 制作计划',selection:{basis:'manual',rationale:'G4 界面与协议验收样例；使用既有本地媒体文件，不代表正式内容生产。',evidenceKeys:[]},freshnessWindowHours:24,evidence:[],
      retention:'platform_originals_and_exact_methods',modules:definitions.map(([domain,title,outputs,dependsOn])=>({moduleKey:domain,title,domain,outputs,dependsOn,required:domain!=='video',purpose:'与同一创作设定保持一致',
        methodPurposes:[...skillPurposes[domain]],methodRetention:'manifest_instructions_and_references',target:{form:'web',runtime:domain==='experience'?{renderer:{key:'dom-choice',version:1},
          reportRenderer:{key:'legacy-text',version:1},inputSchema:'single_choice_v1',engine:'dimensions_v1',reportSchema:'report_content_v1'}:null}}))}});
  const plan=await projects.execute(grants.assessment.access,'project_plan_get',{planRevisionId:project.planRevisionId}),methods={},drafts={},records={},sources={},attempts={},files={};
  const module=domain=>plan.modules.find(m=>m.definition.domain===domain),hash=b=>createHash('sha256').update(b).digest('hex');
  async function upload(domain,target,bytes,fileName,mimeType){const g=grants[domain],u=services.MachineUploadService,p=await u.prepare(g.access,g.token,domain,{requestId:randomUUID(),target,fileName,mimeType,byteSize:bytes.length,checksum:hash(bytes)}),
      stream=Readable.from([bytes]);stream.headers={'content-type':'application/octet-stream','content-length':String(bytes.length)};await u.upload(g.access,domain,p.uploadId,p.ticket,stream);return u.complete(g.access,domain,p.uploadId,p.ticket,{requestId:randomUUID()});}
  for(const [domain,title] of definitions){
    const manifest={schemaVersion:1,domain,name:title+' · 具体观察方法',description:'固定基础方法；商品参数和补充内容单独留存。',purposes:[...skillPurposes[domain]],styles:['克制紫','具体温和'],supportedForms:['web'],
      inputs:[{key:'creative-profile',description:'固定共同创作设定',required:true}],outputs:[{key:'deliverable',description:title}],instructions:domain==='copy'?
      '先读取固定创作设定与被引用的题目。\n\n以一个具体的生活片段开头，不为用户贴标签。\n给出一句可尝试的表达，保留不同相处方式的空间。\n\n输出标题、开场与行动邀请，并标注引用的题目修订。\n\n'+
      Array.from({length:12},(_,i)=>`检查 ${i+1}：核对具体观察、参与者视角和引用来源。此段用于长方法阅读与键盘滚动的技术验收。`).join('\n\n'):
      '读取同一创作设定，以具体观察提供理解和情绪价值；产物应与该模块用途相符。',examples:[],references:[]};
    const created=await projects.execute(grants[domain].access,'project_method_create',{productId:project.productId,methodKey:domain,manifest,requestId:randomUUID()});
    let version=await services.SkillsService.readVersion(access,domain,created.skillId,created.versionId);
    if(domain==='copy'){const bytes=Buffer.from('# 固定语气参考\n\n描述行为与感受，不判断谁对谁错；保留表达与选择的空间。'),f=await upload(domain,{type:'skill_reference',skillId:created.skillId},bytes,'voice-notes.md','text/markdown');
      files.reference={id:f.fileId,checksum:f.checksum};version=await services.SkillsService.save(access,domain,created.skillId,created.versionId,{expectedRevision:version.revision,requestId:randomUUID(),
        manifest:{...manifest,references:[{path:'references/voice-notes.md',fileId:f.fileId}]}});}
    sources[domain]=version;methods[domain]=[];
    for(const purpose of skillPurposes[domain]){const fixed=await projects.execute(grants[domain].access,'project_method_capture',{planModuleId:module(domain).id,expectedModuleDigest:module(domain).digest,purpose,
      sourceVersionId:version.id,expectedSourceDigest:version.digest,expectedSourceRevision:version.revision,...(domain==='copy'?{customization:{parameters:{audience:'想理解相处节奏的人'},instructions:'在邀请参与时使用温和的日常表达。'}}:{}),requestId:randomUUID()});methods[domain].push({snapshotId:fixed.id,digest:fixed.digest});}
  }
  const run=await services.ProductionRunsService.execute(grants.assessment.access,grants.assessment.token,'production_run_create',{productId:project.productId,planRevisionId:plan.id,expectedPlanDigest:plan.digest,
    runKey:'manual-g4',limits:{maxAttemptsPerModule:6,maxTotalAttempts:30,maxConcurrency:4,maxDurationSeconds:7200,maxReportedCostFen:null,maxReportedTokens:null},requestId:randomUUID()});
  async function claim(domain,retry=false){const previous=attempts[domain],g=grants[domain];const a=await services.ProductionRunsService.execute(g.access,g.token,'module_attempt_claim',{
    runId:run.id,planModuleId:module(domain).id,clientKey:'g4-'+domain,methods:methods[domain],inputs:module(domain).definition.dependsOn.map(key=>records[key]).filter(Boolean).map(r=>({recordId:r.id,digest:r.digest})),
    leaseSeconds:1800,...(retry&&previous?{retryOfAttemptId:previous.attempt.id}:{}),requestId:randomUUID()});attempts[domain]=a;return a;}
  async function event(domain,state,reason){const a=attempts[domain],g=grants[domain];a.attempt=await services.ProductionRunsService.execute(g.access,g.token,'module_attempt_event',{
    attemptId:a.attempt.id,leaseToken:a.leaseToken,expectedRevision:a.attempt.revision,requestId:randomUUID(),state,step:domain==='video'?'S5':'S4',reasonCode:'g4-verification',reason,job:null,reportedCostFen:null,reportedTokens:null});}
  async function draft(domain,payload){const d=await projects.execute(grants[domain].access,'project_draft_save',{planModuleId:module(domain).id,expectedModuleDigest:module(domain).digest,methods:methods[domain],requestId:randomUUID(),payload});
    drafts[domain]=payload.kind==='asset'?{...d,assetId:(await fixture.runtime.client.contentRevision.findUniqueOrThrow({where:{id:d.revisionId}})).assetId}:d;return d;}
  async function record(domain,outputs){const r=await projects.execute(grants[domain].access,'project_production_save',{planModuleId:module(domain).id,expectedModuleDigest:module(domain).digest,expectedRevision:records[domain]?.revision??0,
    requestId:randomUUID(),methods:methods[domain],inputs:module(domain).definition.dependsOn.map(key=>records[key]).filter(Boolean).map(r=>({recordId:r.id,digest:r.digest})),outputs,
    external:{client:'G4 本地技术验收',runKey:'g4-'+domain,note:'固定本地测试文件与合成结构；平台未发起模型或媒体制作。',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}});records[domain]=r;return r;}
  const native=(outputKey,d,kind='content_revision')=>({kind,outputKey,revisionId:d.revisionId,digest:d.digest});
  async function finish(domain){const a=attempts[domain],g=grants[domain],r=records[domain];a.attempt=await services.ProductionRunsService.execute(g.access,g.token,'module_attempt_complete',{
    attemptId:a.attempt.id,leaseToken:a.leaseToken,expectedRevision:a.attempt.revision,recordId:r.id,expectedRecordDigest:r.digest,requestId:randomUUID()});}
  const configuration=(await fixture.runtime.client.productVersion.findFirstOrThrow({where:{productId:original.id}})).configuration;
  await claim('assessment');const assessment=await draft('assessment',{kind:'assessment',configuration,expectedRevision:0});await record('assessment',[native('questions',assessment),native('report',assessment)]);await finish('assessment');
  const asset=(domain,content,fileId)=>({kind:'asset',draft:{productVersionId:assessment.productVersionId,platform:'manual',variant:'primary',expectedRevision:drafts[domain]?.revision??0,
    ...(drafts[domain]?.assetId?{assetId:drafts[domain].assetId}:{}),fileId,authoring:{schemaVersion:1,creativeProfileRevisionId:project.creativeProfileRevisionId,content,media:{localArchive:null,previewFileId:null},inputs:[]}}});
  await claim('cover');const png=await readFile(join(root,'apps/web/public/assets/store/featured-lavender.png')),picture=await upload('cover',{type:'media',productVersionId:assessment.productVersionId,kind:'cover'},png,'g4-cover.png','image/png');
  const cover=await draft('cover',asset('cover',{kind:'cover',title:'你的靠近，有自己的节奏',description:'既有本地图片，用于媒体预览与原件验证。'},picture.fileId));await record('cover',[native('cover',cover)]);await finish('cover');
  async function writeCopy(text,retry=false){await claim('copy',retry);const copy=await draft('copy',asset('copy',{kind:'copy',blocks:[{blockId:'title',role:'title',text:'你的靠近，有自己的节奏'},
      {blockId:'hook',role:'hook',text},{blockId:'cta',role:'cta',text:'从一个生活片段开始，看看自己此刻需要什么。'}]},null));await record('copy',[native('copy',copy)]);await finish('copy');}
  await writeCopy('有时想聊很多，有时只想安静待一会。');
  await claim('experience');const version=await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:assessment.productVersionId}}),profileRow=await fixture.runtime.client.creativeProfileRevision.findUniqueOrThrow({where:{id:project.creativeProfileRevisionId}}),
    experience=await draft('experience',{kind:'experience',productVersionId:version.id,draft:{manifest:defaultExperience(version,'purple',profileRow),reportPlan:profile.reportPlan,expectedRevision:0,expectedVersionRevision:version.revision,note:'本地体验制作清单'}});
  await record('experience',[native('web',experience,'experience_revision')]);await event('experience','validation_failed','实际校验发现缺少网页原件，需要补交。');
  await claim('video');await event('video','failed','外部制作端申报失败（本地技术验收情境），尚无视频原件。');
  async function repairExperience(){await claim('experience',true);const bytes=Buffer.from('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>项目验收原件</title></head><body><main><h1>相处节奏观察</h1><p>本地技术验收原件。</p></main></body></html>'),
      file=await upload('experience',{type:'project_original',planModuleId:module('experience').id,outputKey:'web',fileKey:'source'},bytes,'project-original.html','text/html');files.original={id:file.fileId,checksum:file.checksum};
    await record('experience',[native('web',experience,'experience_revision'),{kind:'original_file',outputKey:'web',fileKey:'source',originalFileId:file.fileId,checksum:file.checksum}]);await finish('experience');}
  async function repairVideo(){await claim('video',true);if(!files.video)files.video=await upload('video',{type:'media',productVersionId:assessment.productVersionId,kind:'video'},
      await readFile(join(root,'apps/api/test/fixtures/preview.webm')),'g4-protocol-video.webm','video/webm');
    const video=await draft('video',asset('video',{kind:'video',scenes:[{sceneId:'opening',startMs:0,endMs:1000,text:'协议验收视频，不代表正式商品成片。'}]},files.video.fileId));await record('video',[native('video',video)]);await finish('video');}
  async function scaleProject(){const product=await services.CatalogAdminService.create(access,{...AdminProductInputSchema.strip().parse(original),slug:'g4-scale-'+randomUUID(),name:'40 模块规模验收',requestId:randomUUID()}),
      p=await services.ContentService.saveProfile(access,product.id,{expectedRevision:0,profile,requestId:randomUUID()}),base=plan.plan.modules.find(m=>m.domain==='copy');
    const large=await services.ProductionPlansService.save(access,product.id,{expectedRevision:0,requestId:randomUUID(),plan:{...plan.plan,title:'40 模块 · 关系定位验收',creativeProfileRevisionId:p.id,
      modules:Array.from({length:40},(_,i)=>({...base,moduleKey:'module-'+i,title:'扩展物料 '+String(i+1).padStart(2,'0'),required:false,dependsOn:i?['module-0']:[]}))}});return {productId:product.id,plan:large};}
  async function reviseCopy(){const version=sources.copy,fixed=await projects.execute(grants.copy.access,'project_method_capture',{planModuleId:module('copy').id,
    expectedModuleDigest:module('copy').digest,purpose:'copywriting',sourceVersionId:version.id,expectedSourceDigest:version.digest,expectedSourceRevision:version.revision,
    customization:{parameters:{audience:'想理解相处节奏的人'},instructions:'按退回意见，用具体的日常沟通句式表达独处与靠近的需要。'},requestId:randomUUID()});
    methods.copy=[{snapshotId:fixed.id,digest:fixed.digest}];return writeCopy('我想先安静一会，再把今天的感受慢慢告诉你。',true);}
  return {project,plan,run,records,methods,drafts,files,repairExperience,repairVideo,reviseCopy,scaleProject,services};
}
