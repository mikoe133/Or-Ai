import assert from'node:assert/strict';
import {test}from'node:test';
import {mkdtempSync,writeFileSync,rmSync}from'node:fs';
import {join}from'node:path';import{tmpdir}from'node:os';
import {currentUploadProfiles,inspectUploadBudget,runUploadBudget}from'../upload-budget.mjs';
const {profiles,sdkFileCeilingBytes}=await currentUploadProfiles();
const env=(bytes,reserve=0)=>({UPLOAD_INGRESS_BODY_BYTES:String(bytes),UPLOAD_REQUEST_ENVELOPE_BYTES:String(reserve)});
const video=profiles.find(p=>p.name==='web.video');

test('actual application defaults and existing contracts retain their byte ceilings',()=>{
 assert.equal(video.applicationMaxBytes,100*1024*1024);assert.equal(profiles.find(p=>p.name==='web.image').applicationMaxBytes,10*1024*1024);
 assert.equal(profiles.find(p=>p.name==='web.project_original').applicationMaxBytes,100*1024*1024);
 assert.equal(profiles.find(p=>p.name==='web.skill_reference').applicationMaxBytes,5*1024*1024);assert.equal(sdkFileCeilingBytes,200*1024*1024);
});
test('unset ingress and unset framing remain pending without inventing a provider allowance',()=>{
 const r=inspectUploadBudget({},profiles);assert.equal(r.status,'pending');assert.equal(r.configurationComplete,false);assert.ok(r.profiles.every(p=>p.fitsConfiguredBudget===null));assert.equal(r.deploymentReady,false);
});
test('one missing parameter cannot pass by assuming a zero wrapper or an unlimited ingress',()=>{
 for(const input of [{UPLOAD_INGRESS_BODY_BYTES:'100000000'},{UPLOAD_REQUEST_ENVELOPE_BYTES:'0'}])assert.equal(inspectUploadBudget(input,profiles).status,'pending');
});
test('100MB and 100MiB are different; current video and project originals expose the mismatch',()=>{
 const r=inspectUploadBudget(env(100000000),profiles);assert.equal(r.status,'inconsistent');
 for(const name of ['web.video','mcp.video','web.project_original','mcp.project_original'])assert.equal(r.profiles.find(p=>p.name===name).fitsConfiguredBudget,false);
 assert.equal(r.profiles.find(p=>p.name==='web.video').maximumRequestBodyBytes-100000000,4857600);
});
test('exact bytes fit while one byte less fails, without changing any application limit',()=>{
 const before=JSON.stringify(profiles);assert.equal(inspectUploadBudget(env(video.applicationMaxBytes),profiles).status,'consistent');
 assert.equal(inspectUploadBudget(env(video.applicationMaxBytes-1),profiles).status,'inconsistent');assert.equal(JSON.stringify(profiles),before);
});
test('an explicitly known zero raw-body wrapper is valid, while an actual wrapper consumes allowance',()=>{
 const bytes=video.applicationMaxBytes;
 assert.equal(inspectUploadBudget(env(bytes,0),profiles).status,'consistent');assert.equal(inspectUploadBudget(env(bytes,1),profiles).status,'inconsistent');
 assert.equal(inspectUploadBudget(env(bytes+4096,4096),profiles).status,'consistent');
});
test('negative, fractional, exponential, unsafe and secret-like inputs fail without reflection',()=>{
 for(const value of ['-1','1.5','1e8',String(Number.MAX_SAFE_INTEGER+1),'SYNTHETIC_SECRET_NEVER_PRINT']){
  const r=inspectUploadBudget({...env(video.applicationMaxBytes),UPLOAD_INGRESS_BODY_BYTES:value},profiles);assert.equal(r.status,'invalid');assert.ok(!JSON.stringify(r).includes('SYNTHETIC_SECRET_NEVER_PRINT'));
 }
});
test('wrapper exhausting the entire request and safe-integer overflow cannot pass',()=>{
 assert.equal(inspectUploadBudget(env(1,1),profiles).status,'inconsistent');
 const r=inspectUploadBudget(env(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER-1),profiles);assert.equal(r.status,'invalid');assert.ok(r.issues.some(i=>i.code==='REQUEST_BYTE_TOTAL_UNSAFE'));
});
test('configured application overrides are read through the real API loader and SDK ceiling still bounds MCP',async()=>{
 const current=await currentUploadProfiles({ASSET_MAX_VIDEO_BYTES:String(512*1024*1024)});
 assert.equal(current.profiles.find(p=>p.name==='web.video').applicationMaxBytes,512*1024*1024);
 assert.equal(current.profiles.find(p=>p.name==='mcp.video').applicationMaxBytes,sdkFileCeilingBytes);
 await assert.rejects(currentUploadProfiles({ASSET_MAX_VIDEO_BYTES:'-1'}));
});
test('CLI sample remains not configured; missing files/arguments never expose supplied values',async()=>{
 const r=await runUploadBudget(['--env-file',new URL('../../.env.upload-budget.example',import.meta.url)]);assert.equal(r.exitCode,2);assert.equal(r.report.status,'pending');
 for(const args of [[],['--env-file','/missing/SYNTHETIC_SECRET_NEVER_PRINT']]){const r=await runUploadBudget(args);assert.equal(r.exitCode,1);assert.ok(!JSON.stringify(r).includes('SYNTHETIC_SECRET_NEVER_PRINT'));}
});
test('a complete consistent inventory only passes arithmetic and cannot claim real ingress or deployment acceptance',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'orai-budget-')),file=join(dir,'input.env');
 try{writeFileSync(file,Object.entries(env(video.applicationMaxBytes)).map(([k,v])=>k+'='+v).join('\n'),{mode:0o600});
  const r=await runUploadBudget(['--env-file',file]);assert.equal(r.exitCode,0);assert.equal(r.report.actualIngressVerified,false);assert.equal(r.report.providerSelected,false);assert.equal(r.report.deploymentReady,false);assert.equal(r.report.limitsChanged,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
