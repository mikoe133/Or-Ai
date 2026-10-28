// Read-only contract proof: no DB, browser, renderer execution, imports or publication.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../apps/api/package.json',import.meta.url));
const {ProductionPlanBootstrapDocumentSchema,ProductionPlanDocumentSchema,productPlanPendingFields,
  registeredPlanRuntime,threejsPublicationIssues}=require('@orai/contracts/admin');
const {ExperienceManifestSchema,supportsExperience}=require('@orai/contracts/experience');
const results=[];
for(const name of ['garden-observation.json','relationship-atlas.json']){
  const fixture=JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
  assert.equal(fixture.purpose,'synthetic_technical_preparation_only');assert.equal(fixture.userApprovedFormalProduct,false);
  assert.equal(fixture.publishable,false);assert.equal(fixture.runtimeImplementedForThisPlan,false);assert.equal(fixture.actualPerformanceMeasured,false);
  assert.deepEqual(fixture.databaseObjectIds,[]);assert.equal(ProductionPlanDocumentSchema.safeParse(fixture).success,false);
  const draft=ProductionPlanBootstrapDocumentSchema.parse(fixture.plan);
  assert.deepEqual(productPlanPendingFields(draft.productPlan),[]);
  assert.ok(Object.values(draft.productPlan.decisions).every(decision=>decision.status==='planned'&&decision.evidence.length===0));
  assert.equal(draft.productPlan.implementation,'threejs');assert.equal(new Set(draft.modules.flatMap(module=>module.methodPurposes)).size,7);
  const scene=draft.modules.find(module=>module.moduleKey==='scene');assert.ok(scene?.target.runtime);
  const registered=!!registeredPlanRuntime(scene);assert.equal(registered,fixture.registeredPairReference);
  // Synthetic IDs are used only in this in-memory parser check, never saved.
  const plan=ProductionPlanDocumentSchema.parse({...draft,creativeProfileRevisionId:'00000000-0000-4000-8000-000000000051'});
  const manifest=ExperienceManifestSchema.parse({schemaVersion:1,
    content:{versionId:'00000000-0000-4000-8000-000000000052',inputSchema:'single_choice_v1',engine:'dimensions_v1'},creativeProfileRevisionId:null,intent:null,
    renderer:scene.target.runtime.renderer,report:{contentSchema:'report_content_v1',renderer:scene.target.runtime.reportRenderer},
    fallback:{key:'dom-choice',version:1},theme:{key:'synthetic-technical-only',revision:1},confirmation:'explicit',recovery:'server_confirmed_answers',
    scenes:[{sceneId:'technical-scene',questionId:'technical-question',checkpointId:'technical-checkpoint',choices:[{objectId:'technical-object-a',optionId:'technical-option-a'},{objectId:'technical-object-b',optionId:'technical-option-b'}]}],resources:[]});
  assert.equal(supportsExperience(manifest),registered);
  const issues=threejsPublicationIssues(plan,scene,manifest);assert.ok(issues.length>0,'a complete planning document must not certify an unimplemented delivery');
  results.push({file:name,planningContractValid:true,dimension:draft.productPlan.visualDimension,registeredPairReference:registered,
    requiredFeaturesStage:'planned',publicationBlocked:true,publicationIssueCount:issues.length,actualRuntimeImplemented:false,performanceMeasured:false});
}
assert.equal(results.filter(item=>item.registeredPairReference).length,1);
console.log(JSON.stringify({scope:'synthetic_contract_preparation_only',results,actualProductsSelected:0,databaseWrites:0,
  actualDeliverablesCreated:0,newRenderersRegistered:0,browserOrDeviceAcceptancePerformed:false,cloudCalls:0},null,2));
