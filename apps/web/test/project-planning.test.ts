import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ProductionPlanDocumentSchema} from '@orai/contracts/admin';
import {emptyProjectPlan,addPlanningModule,editPlanningDependency,layoutForPlan,positionsFromLayout,planningWorkspace} from '../src/admin/project-planning-model.js';
import type {ProjectWorkspaceData} from '../src/admin/project-api.js';
import {moduleSummary} from '../src/admin/project-model.js';
const profile='11111111-1111-4111-8111-111111111111';
function plan(){return ProductionPlanDocumentSchema.parse({...emptyProjectPlan(profile,'功能验收计划'),modules:[{moduleKey:'copy',title:'引流文案',domain:'copy',required:true,purpose:'整理文本',dependsOn:[],
  target:{form:'web',runtime:null},methodPurposes:['copywriting'],methodRetention:'manifest_instructions_and_references',outputs:[{outputKey:'copy',label:'文案',kind:'copy',required:true,
    original:{storage:'platform',representation:'structured'},files:[]}]}]});}
test('adding modules preserves the existing plan and creates valid domain-specific declarations without generating content',()=>{
  const original=plan(),before=structuredClone(original);
  for(const domain of ['cover','video','assessment','experience'] as const){const next=addPlanningModule(original,{moduleKey:'extra-'+domain,title:'新增模块',domain,required:false,upstream:'copy'});
    assert.equal(next.modules.length,2);assert.deepEqual(next.modules[1]!.dependsOn,['copy']);assert.equal(next.modules[1]!.required,false);
    assert.ok(ProductionPlanDocumentSchema.safeParse(next).success);assert.equal(next.modules[1]!.outputs[0]!.original.storage,'platform');
    assert.equal(JSON.stringify(next).includes('fileId'),false);assert.deepEqual(original,before);}
});
test('dependency edits respect direction, reject cycles and never mutate the prior plan or allow method/foreign-node edges',()=>{
  const original=plan(),second=addPlanningModule(original,{moduleKey:'video',title:'视频',domain:'video',required:true,upstream:'copy'}),before=structuredClone(second);
  assert.throws(()=>editPlanningDependency(second,'video','copy'),/循环/);assert.throws(()=>editPlanningDependency(second,'copy','copy'),/自身/);
  assert.throws(()=>editPlanningDependency(second,'method:fixed','video'),/当前计划/);assert.throws(()=>editPlanningDependency(second,'copy','video'),/已有/);
  const removed=editPlanningDependency(second,'copy','video',undefined,true);assert.deepEqual(removed.modules[1]!.dependsOn,[]);
  const reversed=editPlanningDependency(second,'video','copy',{source:'copy',target:'video'});assert.deepEqual(reversed.modules[0]!.dependsOn,['video']);assert.deepEqual(reversed.modules[1]!.dependsOn,[]);
  assert.deepEqual(second,before);
});
test('forty modules remain valid, while a forty-first module and duplicate stable keys are rejected',()=>{
  let value=plan();for(let i=1;i<40;i++)value=addPlanningModule(value,{moduleKey:'copy-'+i,title:'文案 '+i,domain:'copy',required:false});
  assert.equal(value.modules.length,40);assert.throws(()=>addPlanningModule(value,{moduleKey:'extra',title:'超额',domain:'copy',required:false}),/40/);
  assert.throws(()=>addPlanningModule(plan(),{moduleKey:'copy',title:'重名标识',domain:'copy',required:false}));
});
test('layout serialization retains only the current plan and stable module keys, and rejects unbounded coordinates',()=>{
  const value=plan(),positions={plan:{x:0,y:10},'module:copy':{x:320,y:-40},'module:foreign':{x:1,y:2},'method:fixed':{x:3,y:4}};
  const serialized=layoutForPlan(positions,value);assert.deepEqual(positionsFromLayout(serialized),{plan:{x:0,y:10},'module:copy':{x:320,y:-40}});
  assert.throws(()=>layoutForPlan({'module:copy':{x:Infinity,y:0}},value));assert.throws(()=>layoutForPlan({plan:{x:100001,y:0}},value));
});
test('pending nodes keep existing module identities and records local to their exact base plan',()=>{
  const value=plan(),base={productId:'product',scope:'demo',observedAt:'2026-10-22T00:00:00Z',profile:null,plan:{id:'fixed',modules:[{id:'snapshot',moduleId:'stable',moduleKey:'copy',digest:'fixed',definition:value.modules[0]}],
    plan:value,revision:1,digest:'plan-digest',creativeProfileDigest:'profile-digest',createdAt:'2026-10-22T00:00:00Z'},methods:[],records:[]} as unknown as ProjectWorkspaceData;
  const next=planningWorkspace(base,addPlanningModule(value,{moduleKey:'extra',title:'新增',domain:'copy',required:true}),null);
  assert.equal(next.plan!.modules[0]!.id,'snapshot');assert.equal(next.plan!.modules[0]!.moduleId,'stable');assert.equal(next.plan!.modules[1]!.id,'draft:extra');
  assert.equal(base.plan!.modules.length,1);assert.equal(next.records,base.records);assert.equal(next.plan!.digest,base.plan!.digest);
  assert.equal(moduleSummary(next,next.plan!.modules[1]!).state,'planning_draft');
});
