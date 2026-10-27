import {readFileSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';
const apiRequire=createRequire(new URL('../apps/api/package.json',import.meta.url));
const fields=['UPLOAD_INGRESS_BODY_BYTES','UPLOAD_REQUEST_ENVELOPE_BYTES'];

// Read actual application defaults and public schema ceilings, never provider plans.
// The synthetic configuration is parsed only; it cannot open a DB or storage client.
export async function currentUploadProfiles(env={}) {
 const {loadConfiguration}=await import('../apps/api/dist/config/configuration.js');
 const {MAX_FILE_BYTES}=await import('../packages/mcp/dist/config.js');
 const {AdminUploadPrepareSchema,ProjectOriginalPrepareSchema,SkillFilePrepareSchema}=apiRequire('@orai/contracts/admin');
 const settings=loadConfiguration({APP_ENV:'test',NODE_ENV:'test',ASSET_STORAGE_DRIVER:'disabled',
  DATABASE_URL:'postgresql://unconfigured@127.0.0.1/upload_budget',CSRF_SIGNING_KEY:'c'.repeat(43),
  ...(env.ASSET_MAX_IMAGE_BYTES===undefined?{}:{ASSET_MAX_IMAGE_BYTES:env.ASSET_MAX_IMAGE_BYTES}),
  ...(env.ASSET_MAX_VIDEO_BYTES===undefined?{}:{ASSET_MAX_VIDEO_BYTES:env.ASSET_MAX_VIDEO_BYTES})}).assets;
 const max=schema=>{const value=schema.shape.byteSize.maxValue;if(!Number.isSafeInteger(value)||value<1)throw new Error('Schema ceiling unavailable');return value;};
 const caps={image:Math.min(settings.maxImageBytes,max(AdminUploadPrepareSchema)),video:Math.min(settings.maxVideoBytes,max(AdminUploadPrepareSchema)),
  project_original:max(ProjectOriginalPrepareSchema),skill_reference:max(SkillFilePrepareSchema)};
 const profiles=Object.entries(caps).flatMap(([name,bytes])=>[{name:'web.'+name,applicationMaxBytes:bytes},{name:'mcp.'+name,applicationMaxBytes:Math.min(bytes,MAX_FILE_BYTES)}]);
 return {profiles,sdkFileCeilingBytes:MAX_FILE_BYTES,scope:'upper bounds across existing upload purposes; smaller per-purpose limits still apply'};
}

export function inspectUploadBudget(env,profiles) {
 const issues=[],values={};
 for(const field of fields){
  const raw=env[field];
  if(raw===undefined||raw===''){values[field]=null;issues.push({code:'BUDGET_NOT_CONFIGURED',fields:[field]});continue;}
  if(typeof raw!=='string'||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<(field===fields[0]?1:0)){
   values[field]=null;issues.push({code:'INVALID_BYTE_BUDGET',fields:[field]});continue;
  }
  values[field]=Number(raw);
 }
 const ingress=values[fields[0]],envelope=values[fields[1]],complete=ingress!==null&&envelope!==null;
 if(complete&&envelope>=ingress)issues.push({code:'ENVELOPE_EXHAUSTS_BODY_BUDGET',fields});
 const checked=profiles.map(profile=>{
  if(!/^(web|mcp)\.(image|video|project_original|skill_reference)$/.test(profile.name)||!Number.isSafeInteger(profile.applicationMaxBytes)||profile.applicationMaxBytes<1)throw new Error('Invalid upload profile');
  const total=complete?BigInt(profile.applicationMaxBytes)+BigInt(envelope):null;
  const safe=total!==null&&total<=BigInt(Number.MAX_SAFE_INTEGER);
  const fits=total===null?null:total<=BigInt(ingress);
  if(total!==null&&!safe)issues.push({code:'REQUEST_BYTE_TOTAL_UNSAFE',fields});
  if(fits===false)issues.push({code:'APPLICATION_LIMIT_EXCEEDS_INGRESS_BUDGET',profile:profile.name,fields});
  return {...profile,requestEnvelopeBytes:envelope,maximumRequestBodyBytes:safe?Number(total):null,fitsConfiguredBudget:fits};
 });
 const invalid=issues.some(i=>i.code==='INVALID_BYTE_BUDGET'||i.code==='REQUEST_BYTE_TOTAL_UNSAFE');
 const status=invalid?'invalid':!complete?'pending':issues.length?'inconsistent':'consistent';
 return {status,configurationComplete:complete,ingressBodyBytes:ingress,requestEnvelopeBytes:envelope,profiles:checked,issues,
  deploymentReady:false,actualIngressVerified:false,limitsChanged:false,providerSelected:false,cloudCalls:0,
  byteSemantics:'request body bytes only; account for any actual body wrapper separately; HTTP headers are outside this budget'};
}

export async function runUploadBudget(args){
 if(args.length!==2||args[0]!=='--env-file')return{exitCode:1,report:{error:'EXPLICIT_ENV_FILE_REQUIRED'}};
 let env;
 try{if(!statSync(args[1]).isFile()||statSync(args[1]).size>1024*1024)throw new Error();env=parseEnv(readFileSync(args[1],'utf8'));}
 catch{return{exitCode:1,report:{error:'ENV_FILE_UNREADABLE_OR_TOO_LARGE'}};}
 let current;
 try{current=await currentUploadProfiles(env);}catch{return{exitCode:1,report:{error:'APPLICATION_LIMITS_UNAVAILABLE_OR_INVALID'}};}
 const report={...inspectUploadBudget(env,current.profiles),sdkFileCeilingBytes:current.sdkFileCeilingBytes,scope:current.scope};
 return{report,exitCode:report.status==='consistent'?0:report.status==='pending'?2:1};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{const{report,exitCode}=await runUploadBudget(process.argv.slice(2));console.log(JSON.stringify(report,null,2));process.exitCode=exitCode;}
 catch{console.log(JSON.stringify({error:'UPLOAD_BUDGET_CHECK_FAILED'}));process.exitCode=1;}
}
