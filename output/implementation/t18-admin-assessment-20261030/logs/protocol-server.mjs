// TEST protocol substitute. It stores no credentials, grants, configurations or schedules.
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startPerformanceServer} from '../../apps/web/e2e/experience-performance-server.mjs';
import {uiFixtureOrigin} from '../../apps/web/e2e/ui-fixture-origin.mjs';
import {AccountContextSchema,AnonymousSessionContextSchema} from '../../packages/contracts/dist/private.js';
import {AdminOverviewSchema,CodexConnectionSchema,MachineWorkspaceSchema,ExternalConfigurationSchema,CodexConnectionPreviewSchema,codexDomainGrants} from '../../packages/contracts/dist/admin.js';
const root=resolve('.'),directory=resolve('.local/t18-admin-assessment-20261030');
const f=JSON.parse(await readFile('.local/t18-admin-connections-20261029/read-fixtures.json','utf8'));
CodexConnectionSchema.parse(f.active);CodexConnectionSchema.parse(f.revoked);MachineWorkspaceSchema.parse(f.workspace);ExternalConfigurationSchema.parse(f.current);ExternalConfigurationSchema.parse(f.old);
const epoch='2026-10-30T00:00:00.000Z',sessionExpiresAt='2026-11-02T00:00:00.000Z';
const context=AccountContextSchema.parse({configured:true,account:{id:'11111111-1111-4111-8111-111111111111',role:'admin',emailVerified:true},csrfToken:'TEST-READONLY-NON-CREDENTIAL-'.repeat(4),sessionExpiresAt});
const anonymous=AnonymousSessionContextSchema.parse({authenticated:false,csrfToken:context.csrfToken,sessionExpiresAt:null});
const overview=AdminOverviewSchema.parse({scope:'demo',generatedAt:epoch,attribution:'unconfirmed',events:[],orders:{recordedCount:0,recordedAmountFen:0,paymentVerified:false,statuses:[]},products:0,assets:0});
const page=(items,size=20)=>({items,page:1,pageSize:size,total:items.length});
const p=JSON.parse(await readFile(directory+'/fixtures.json','utf8'));
const requests=[];let web;
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');let control={};
  try{control=JSON.parse(await readFile(directory+'/control.json','utf8'));}catch{}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>65536){res.writeHead(413);res.end();return;}}
  const bodyDigest=raw?createHash('sha256').update(raw).digest('hex'):undefined;
  const hit=control.failures?.find(f=>(!f.method||f.method===req.method)&&(f.exact?url.pathname===f.path:url.pathname.startsWith(f.path)));
  const status=hit?.status??(req.method==='GET'?200:403);
  const send=(data,code=200)=>{requests.push({method:req.method,path:url.pathname,status:code,...(bodyDigest?{bodyDigest}:{})});void appendFile(directory+'/requests-live.jsonl',JSON.stringify(requests.at(-1))+'\n');res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
  if(control.delay?.path===url.pathname)await new Promise(resolve=>setTimeout(resolve,Math.min(control.delay.ms,10000)));
  if(hit)return send({error:{code:hit.status===403?'FORBIDDEN':hit.status===401?'UNAUTHORIZED':hit.status===409?'CONFLICT':'SERVICE_UNAVAILABLE',message:'TEST 受控故障 '+hit.status,requestId:'11111111-1111-4111-8111-111111111111'}},hit.status);
  if(req.method==='POST'&&url.pathname==='/api/admin/codex-connections/preview'){const plan=JSON.parse(raw);return send(CodexConnectionPreviewSchema.parse({plan,scope:'demo',digest:createHash('sha256').update(raw).digest('hex'),summary:{...f.active.summary,grants:codexDomainGrants(plan)}}));}
  if(req.method==='POST'&&url.pathname.endsWith('/stop/preview'))return send(p.stopPreview);
  if(req.method!=='GET')return send({error:{code:'FORBIDDEN',message:'TEST 禁止写入或签发',requestId:'11111111-1111-4111-8111-111111111111'}},403);
  if(url.pathname==='/api/account/context')return send(control.identity==='member'?{...context,account:{...context.account,role:'user'}}:control.identity==='anonymous'?{...context,account:null}:context);
  if(url.pathname==='/api/session/context')return send(anonymous);
  if(url.pathname==='/api/admin/overview')return send(overview);
  if(url.pathname==='/api/admin/categories')return send(page(control.includeCategory?[{...f.active.summary.categories[0],slug:'test-category',sortOrder:0,revision:1}]:[],50));
  if(url.pathname==='/api/admin/products/'+p.product.id)return send(p.product);
  if(url.pathname.endsWith('/creative-profiles'))return send(page([p.profile],50));
  if(url.pathname.endsWith('/versions'))return send(page([p.version],50));
  if(url.pathname.endsWith('/preview'))return send(p.versionPreview);
  if(url.pathname.endsWith('/experience'))return send(p.experienceWorkspace);
  if(url.pathname.endsWith('/experience/history'))return send(page([],20));
  if(url.pathname==='/api/admin/content-revisions')return send(page([p.assessment],50));
  if(url.pathname==='/api/admin/content-revisions/'+p.assessment.id)return send(control.mode==='manual-source'?{...p.assessmentDetail,production:null}:p.assessmentDetail);
  if(url.pathname.endsWith('/skill-sets'))return send(page([],50));
  if(url.pathname.endsWith('/project-workspace'))return send(control.mode==='empty'?{...p.workspace,plan:null,plans:page([])}:control.mode==='snapshot'?{...p.workspace,source:'run'}:p.workspace);
  if(url.pathname.endsWith('/canvas-layout'))return send(p.canvas);
  if(url.pathname.endsWith('/production-plans'))return send(page([p.workspace.plan],1));
  if(url.pathname.endsWith('/cleanup-candidates'))return send(page(control.mode==='empty'?[]:[p.cleanupCandidate],20));
  if(url.pathname.startsWith('/api/admin/file-cleanups/')){const plan=url.pathname.endsWith(p.otherCleanupPlan.id)?p.otherCleanupPlan:p.cleanupPlan;return send(control.mode==='complete'?{...plan,status:'complete',results:[{fileId:plan.files[0].id,status:'protected',message:'TEST metadata only: retained'}]}:plan);}
  if(url.pathname.endsWith('/method-candidates'))return send(page(control.mode==='empty'?[]:[p.candidate],10));
  if(url.pathname.endsWith('/methods'))return send(page(control.mode==='empty'?[]:[p.fixedMethod],20));
  if(url.pathname.endsWith('/handoff-inputs'))return send(p.handoffOptions);
  if(url.pathname.endsWith('/production-runs'))return send(page(control.mode==='empty'?[]:[p.run],20));
  if(url.pathname.endsWith('/operations'))return send(p.operations);
  if(url.pathname.endsWith('/attempts'))return send(page([p.attempt,p.oldAttempt],10));
  if(url.pathname==='/api/admin/codex-connections')return send(page(control.mode==='active'?[f.active,f.revoked]:control.mode==='revoked'?[f.revoked]:[]));
  if(url.pathname.startsWith('/api/admin/codex-connections/'))return send(url.pathname.endsWith(f.revoked.id)?f.revoked:f.active);
  if(url.pathname==='/api/admin/machine-workspaces')return send(page([f.workspace]));
  if(url.pathname==='/api/admin/external-run-configurations/options')return send(f.options);
  if(url.pathname==='/api/admin/external-run-configurations')return send(page(control.mode==='configuration'?[f.current]:[],10));
  if(url.pathname.endsWith('/revisions'))return send(page([f.current.revision,f.old.revision],10));
  if(url.pathname.startsWith('/api/admin/external-run-configurations/'))return send(url.searchParams.get('revisionId')===f.old.revision.id?f.old:f.current);
  return send({error:{code:'NOT_FOUND',message:'TEST 未提供此只读响应',requestId:'11111111-1111-4111-8111-111111111111'}},404);
});
await writeFile(directory+'/control.json',JSON.stringify({mode:'new'}));
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=uiFixtureOrigin(5192);web=await startPerformanceServer({root,apiOrigin:'http://127.0.0.1:'+server.address().port,port:5192});
await writeFile(directory+'/state.json',JSON.stringify({pid:process.pid,origin,connectionId:f.active.id,revokedId:f.revoked.id,configurationId:f.current.id,historyId:f.old.revision.id,productId:p.product.id,planId:p.workspace.plan.id,copyModuleId:p.workspace.plan.modules[1].id,versionId:p.version.id,assessmentId:p.assessment.id,cleanupPlanId:p.cleanupPlan.id,otherCleanupPlanId:p.otherCleanupPlan.id,runId:p.run.id,attemptId:p.attempt.id,oldAttemptId:p.oldAttempt.id}));
console.log('READY '+origin+'/admin/machine');
async function stop(){await web.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await writeFile(directory+'/requests.json',JSON.stringify(requests,null,2));console.log('CLEANED read-only protocol substitute');process.exit(0);}
process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
