import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moduleSummary,visibleProjectModules,projectLayout} from '../src/admin/project-model.js';
import type {ProjectWorkspaceData,ProjectModule} from '../src/admin/project-api.js';
const module=(id:string,domain='assessment',dependsOn:string[]=[])=>({id,moduleId:'stable-'+id,moduleKey:id,definition:{title:id,domain,required:true,dependsOn,methodPurposes:[],
  outputs:[{outputKey:'main',label:'原件',required:true,kind:domain==='experience'?'web_bundle':'assessment',original:{representation:domain==='experience'?'file':'structured'},
    files:domain==='experience'?[{fileKey:'source',required:true,purpose:'original'}]:[]}]}} as unknown as ProjectModule);
const workspace=(modules:ProjectModule[])=>({plan:{modules},methods:[],records:[],run:null,review:null} as unknown as ProjectWorkspaceData);
test('a native authoring list or preview never substitutes for an experience original',()=>{
  const m=module('experience','experience'),data=workspace([m]);
  data.records=[{planModuleId:m.id,methods:[],outputs:[{outputKey:'main',purpose:'authoring',experienceRevisionId:'draft',file:null}]}] as unknown as typeof data.records;
  assert.equal(moduleSummary(data,m).state,'missing_originals');
  data.records[0]!.outputs[0]!.purpose='preview';assert.equal(moduleSummary(data,m).missing.length,1);
  data.records[0]!.outputs=[{outputKey:'main',fileKey:'source',purpose:'original',file:{fileName:'source.html'}}] as typeof data.records[number]['outputs'];
  assert.equal(moduleSummary(data,m).state,'saved_record');
});
test('failed video preserves its actual failure while another module retains its separately verified result',()=>{
  const a=module('assessment'),v=module('video','video'),data=workspace([a,v]);
  data.run={modules:[{planModuleId:a.id,state:'saved_draft',reason:null},{planModuleId:v.id,state:'failed',reason:'工具失败'}]} as typeof data.run;
  assert.equal(moduleSummary(data,a).label,'已校验保存');assert.equal(moduleSummary(data,v).state,'failed');assert.equal(moduleSummary(data,v).reason,'工具失败');
});
test('returned reviews target the named module and historical retained status only comes from the actual snapshot',()=>{
  const a=module('assessment'),c=module('copy','copy'),data=workspace([a,c]);
  data.records=[{planModuleId:a.id,methods:[],outputs:[]},{planModuleId:c.id,methods:[],outputs:[]}] as unknown as typeof data.records;
  data.review={status:'returned',returns:[{planModuleId:c.id,reason:'修改开场'}]} as typeof data.review;
  assert.equal(moduleSummary(data,c).state,'returned');assert.equal(moduleSummary(data,a).state,'saved_record');
  data.review!.status='retained';assert.equal(moduleSummary(data,c).state,'retained');
});
test('forty-module focus remains bounded and directory search can locate a module outside that focus',()=>{
  const modules=Array.from({length:40},(_,i)=>module('module-'+i,'copy',i?['module-0']:[]));
  assert.equal(visibleProjectModules(modules,modules[0]!.id,'').length,5);
  assert.deepEqual(visibleProjectModules(modules,null,'module-39').map(m=>m.id),['module-39']);
  const layout=projectLayout(modules);assert.equal(new Set(Object.values(layout).map(p=>p.x+':'+p.y)).size,40);
  assert.ok(layout['module-39']!.x>layout['module-0']!.x);
});
