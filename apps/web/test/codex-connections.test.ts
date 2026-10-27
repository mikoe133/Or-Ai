import {test} from 'node:test';
import assert from 'node:assert/strict';
import {codexDomainGrants} from '@orai/contracts/admin';
import {codexDefaults,codexDraftPlan,codexFormIssues,draftCodexSummary,expiryIso,shanghaiInput,connectionHandoff} from '../src/admin/codex-connections-model.js';
import type {CodexConnection,CodexWorkspace} from '../src/admin/codex-connections-api.js';
const key='11111111-1111-4111-8111-111111111111',category={id:key,name:'关系探索'},now=Date.parse('2026-10-22T10:00:00Z');
test('defaults and advanced-only changes never grant operations or leak unselected shared Skill scopes',()=>{
  const form=codexDefaults(category,now);form.maxProjects=6;form.domains.copy.skills=[{id:key,name:'共享方法'}];
  assert.deepEqual(codexDomainGrants(codexDraftPlan(form)),[]);assert.deepEqual(draftCodexSummary(form).sharedSkills,[]);
  assert.equal(form.actions.useSkills,false);assert.ok(codexFormIssues(form,now).some(m=>m.includes('至少选择')));
});
test('uploads require explicit matching method access and never repair user choices silently',()=>{
  const form=codexDefaults(category,now);form.actions.uploadDrafts=true;const before=structuredClone(form);
  assert.ok(codexFormIssues(form,now).some(m=>m.includes('明确允许')));assert.deepEqual(form,before);
  form.actions.useSkills=true;form.domains.video.readSkills=false;assert.ok(codexFormIssues(form,now).some(m=>m.includes('明确允许')));
  form.domains.video.uploadDrafts=false;assert.deepEqual(codexFormIssues(form,now),[]);
});
test('Shanghai dates round-trip independently of the runtime timezone and enforce the actual validity window',()=>{
  assert.equal(shanghaiInput('2026-10-22T10:00:00Z'),'2026-10-22T18:00');assert.equal(expiryIso('2026-10-29T18:00'),'2026-10-29T10:00:00.000Z');
  const form=codexDefaults(category,now);assert.equal(form.expiresLocal,'2026-10-29T18:00');form.actions.useSkills=true;
  form.expiresLocal='2026-10-22T18:00';assert.ok(codexFormIssues(form,now).some(m=>m.includes('到期')));form.expiresLocal='2027-10-22T18:00';assert.ok(codexFormIssues(form,now).some(m=>m.includes('90')));
});
test('existing workspace selection does not serialize edited quotas or categories as an authority expansion',()=>{
  const form=codexDefaults(category,now);form.actions.createProjects=true;form.maxProjects=99;form.categories=[];
  form.workspace={id:key,status:'active',projectCount:3,maxProjects:12,maxMethodsPerProject:8,maxRunsPerProject:20,expiresAt:'2026-10-30T10:00:00Z'} as CodexWorkspace;
  assert.deepEqual(codexDraftPlan(form).workspace,{kind:'existing',id:key});assert.equal(draftCodexSummary(form).maxProjects,12);assert.equal(draftCodexSummary(form).existingProjectCount,3);
  form.workspace.status='revoked';assert.ok(codexFormIssues(form,now).some(m=>m.includes('失效')));
});
test('domain reductions remove their method scope and keep creation exclusive to assessment',()=>{
  const form=codexDefaults(category,now);form.actions={createProjects:true,useSkills:true,uploadDrafts:true};form.domains.copy.skills=[{id:key,name:'文案方法'}];
  form.domains.copy.enabled=false;const plan=codexDraftPlan(form);assert.equal(plan.domains.some(d=>d.domain==='copy'),false);assert.deepEqual(draftCodexSummary(form).sharedSkills,[]);
  for(const grant of codexDomainGrants(plan)){assert.equal(grant.permissions.includes('skills:write'),false);if(grant.domain!=='assessment')assert.equal(grant.permissions.some(p=>p==='projects:write'||p==='projects:create'),false);}
});
test('handoff reveals tokens only for a complete matching active set, while the UI preview remains masked',()=>{
  const connection={id:key,name:'测试连接',status:'active',expiresAt:'2026-10-29T10:00:00Z',workspace:{id:key},credentials:[{id:key,domain:'copy',permissions:['content:read'],skillIds:[]}]} as unknown as CodexConnection;
  const tokens=[{credentialId:key,domain:'copy' as const,token:'synthetic-unit-test-token'}];
  assert.equal(connectionHandoff(connection,null).includes(tokens[0]!.token),false);
  const full=JSON.parse(connectionHandoff(connection,tokens));assert.equal(full.domains[0].env.ORAI_MCP_TOKEN,tokens[0]!.token);assert.equal(full.canReview,false);assert.equal(full.canPublish,false);assert.equal(full.canReadConsumerData,false);
  assert.throws(()=>connectionHandoff(connection,[]),/不完整/);assert.throws(()=>connectionHandoff({...connection,status:'partial'},tokens),/不可用于/);
});
