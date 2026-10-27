import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GraphStore, validateDependency, moduleLayout, visibleModules } from '../src/model.ts';
const fixture = JSON.parse(await readFile(new URL('../../fixture.json', import.meta.url), 'utf8'));
const fresh = () => new GraphStore(fixture);
const byKey = (store,key) => store.getSnapshot().modules.find(module=>module.moduleKey===key);
test('draft relations preserve original fixed fixture, stable identities, source versions and base digest',()=>{
 const source = JSON.stringify(fixture),store=fresh(),copy=byKey(store,'copy'),images=byKey(store,'images');
 assert.equal(store.connect(images.id,copy.id).valid,true);
 assert.equal(store.getSnapshot().draftRevision,1);assert.ok(byKey(store,'copy').definition.dependsOn.includes('images'));
 assert.equal(byKey(store,'copy').id,copy.id);assert.equal(byKey(store,'copy').moduleId,copy.moduleId);
 const exported=store.exportDraft();assert.equal(exported.persisted,false);assert.equal(exported.kind,'g1_design_draft');
 assert.equal(exported.basePlanRevisionId,fixture.plan.id);assert.equal(exported.basePlanDigest,fixture.plan.digest);
 exported.modules[0].definition.title='mutated export';assert.notEqual(store.getSnapshot().modules[0].definition.title,'mutated export');
 assert.equal(JSON.stringify(fixture),source);
});
test('module dependencies refuse self, reverse paths, duplicates, missing nodes and cross-plan revisions without a partial mutation',()=>{
 const store=fresh(),assessment=byKey(store,'assessment'),copy=byKey(store,'copy'),video=byKey(store,'video'),before=JSON.stringify(store.exportDraft());
 for(const [source,target,code] of [[copy.id,copy.id,'SELF'],[video.id,assessment.id,'CYCLE'],[assessment.id,copy.id,'DUPLICATE'],['missing',copy.id,'INVALID_NODE']]){
  const result=store.connect(source,target);assert.equal(result.valid,false);assert.equal(result.code,code);
 }
 const foreign={...copy,id:'foreign',planRevisionId:'different-plan'};
 assert.equal(validateDependency([...store.getSnapshot().modules,foreign],store.getSnapshot().dependencies,copy.id,foreign.id,fixture.plan.id).code,'CROSS_PLAN');
 assert.equal(JSON.stringify(store.exportDraft()),before);
});
test('reconnection replaces exactly one dependency and refuses a cyclic replacement, immutable method edges and source deletion',()=>{
 const store=fresh(),state=store.getSnapshot(),copy=byKey(store,'copy'),assessment=byKey(store,'assessment'),images=byKey(store,'images');
 const edge=state.dependencies.find(edge=>edge.source===assessment.id&&edge.target===copy.id);
 assert.equal(store.connect(images.id,copy.id,edge.id).valid,true);assert.equal(store.getSnapshot().dependencies.length,state.dependencies.length);
 assert.deepEqual(byKey(store,'copy').definition.dependsOn,['images']);
 const before=JSON.stringify(store.exportDraft());assert.equal(store.connect(copy.id,copy.id,store.getSnapshot().dependencies.find(edge=>edge.target===copy.id).id).valid,false);
 assert.equal(store.connect(assessment.id,copy.id,'method-reference:locked').code,'READ_ONLY');
 assert.equal(store.removeDependency('provenance:locked').code,'READ_ONLY');assert.equal(JSON.stringify(store.exportDraft()),before);
 assert.equal(store.removeDependency(store.getSnapshot().dependencies.find(edge=>edge.target===copy.id).id).valid,true);
 assert.deepEqual(byKey(store,'copy').definition.dependsOn,[]);
});
test('adding a follow-up creates one stable identity and one explicit dependency; notes do not become modules',()=>{
 const store=fresh(),copy=byKey(store,'copy'),result=store.add({kind:'module',title:'系列配图',domain:'cover',afterId:copy.id,position:{x:810,y:650}});
 assert.equal(result.valid,true);const row=store.getSnapshot().modules.find(module=>module.id===result.id);
 assert.equal(row.proposed,true);assert.equal(row.definition.domain,'cover');assert.deepEqual(row.definition.dependsOn,['copy']);
 assert.deepEqual(store.getSnapshot().positions['module:'+row.id],{x:810,y:650});
 assert.equal(store.add({kind:'note',title:'请保留原件'}).valid,true);assert.equal(store.getSnapshot().modules.length,6);assert.equal(store.getSnapshot().notes.length,1);
 const old=JSON.stringify(store.exportDraft());assert.equal(store.add({kind:'module',title:'跨计划',domain:'copy',afterId:'foreign'}).valid,false);assert.equal(store.add({kind:'module',title:'  ',domain:'copy'}).valid,false);assert.equal(JSON.stringify(store.exportDraft()),old);
});
test('40-module scale remains collapsed, uses a focused neighborhood and refuses the 41st module while allowing notes',()=>{
 const store=new GraphStore(fixture,40),state=store.getSnapshot();assert.equal(state.modules.length,40);assert.equal(new Set(state.modules.map(row=>row.id)).size,40);
 assert.equal(state.expandedId,null);assert.ok(visibleModules(state).length<40);
 assert.equal(store.add({kind:'module',title:'超出上限',domain:'copy'}).code,'LIMIT');
 assert.equal(store.add({kind:'note',title:'规模观察'}).valid,true);
 const layout=moduleLayout(state.modules,state.dependencies);assert.equal(Object.keys(layout).length,40);assert.ok(Object.values(layout).every(position=>Number.isFinite(position.x)&&Number.isFinite(position.y)));
 const source=JSON.stringify(fixture);assert.equal(fixture.plan.modules.length,5);assert.equal(JSON.stringify(fixture),source);
});
test('old review states reject edits; view positions, collapse and reset do not change fixed provenance',()=>{
 const store=fresh(),copy=byKey(store,'copy'),images=byKey(store,'images');store.setEditing(false);
 assert.equal(store.connect(images.id,copy.id).code,'READ_ONLY');assert.equal(store.add({kind:'module',title:'不允许',domain:'copy'}).code,'READ_ONLY');
 const edge=store.getSnapshot().dependencies[0];assert.equal(store.removeDependency(edge.id).code,'READ_ONLY');
 store.setPosition('module:'+copy.id,{x:123,y:456});store.expand(copy.id);assert.equal(store.getSnapshot().draftRevision,0);
 assert.deepEqual(store.getSnapshot().positions['module:'+copy.id],{x:123,y:456});
 store.setEditing(true);store.connect(images.id,copy.id);store.reset();assert.equal(store.getSnapshot().draftRevision,0);assert.equal(store.getSnapshot().modules.length,5);assert.deepEqual(store.getSnapshot().positions,{});
});

test('switching to a historical scenario shows baseline while returning to work restores the same in-memory identities',()=>{
 const store=fresh(),created=store.add({kind:'module',title:'未保存的新模块',domain:'copy'});assert.equal(created.valid,true);
 const edited=JSON.stringify(store.exportDraft());store.setEditing(false);assert.equal(store.getSnapshot().modules.length,5);assert.equal(store.getSnapshot().draftRevision,0);
 store.setEditing(true);assert.equal(JSON.stringify(store.exportDraft()),edited);assert.ok(store.getSnapshot().modules.some(module=>module.id===created.id));
});
