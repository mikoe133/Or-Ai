import {lstat,readFile,open,rm} from 'node:fs/promises';
import {parseArgs,parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';
import {loadConfiguration} from '../apps/api/dist/config/configuration.js';
import {inspectCloudConfiguration} from './cloud-preflight-lib.mjs';
const webFields=['VITE_APP_PUBLIC_ORIGIN','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'];
const apiFields=new Set(['NODE_ENV','APP_ENV','API_HOST','API_PORT','APP_PUBLIC_ORIGIN','DATABASE_URL','DATABASE_SSL_MODE','DATABASE_POOL_MAX',
  'CSRF_SIGNING_KEY','TRUST_PROXY_CIDRS','ANONYMOUS_SESSION_DAYS','CSRF_TTL_SECONDS','REDEMPTION_IP_LIMIT','REDEMPTION_CODE_LIMIT',
  'ANONYMOUS_READ_IP_LIMIT','ANONYMOUS_WRITE_IP_LIMIT','REDEMPTION_WINDOW_SECONDS','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY',
  'AUTH_SESSION_ENCRYPTION_KEY','ACCOUNT_SESSION_DAYS','AUTH_REQUEST_TIMEOUT_MS','ASSET_STORAGE_DRIVER','ASSET_MAX_IMAGE_BYTES','ASSET_MAX_VIDEO_BYTES',
  'R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','UPLOAD_INGRESS_BODY_BYTES','UPLOAD_REQUEST_ENVELOPE_BYTES','ASSET_UPLOAD_TIMEOUT_MS','R2_REQUEST_TIMEOUT_MS']);
export function splitVpsInventory(env){
  const proof=inspectCloudConfiguration(env,loadConfiguration);
  if(!proof.configurationValid||env.ASSET_STORAGE_DRIVER!=='r2')throw Error('VPS_CONFIGURATION_INVALID');
  const api=Object.fromEntries(Object.entries(env).filter(([key])=>apiFields.has(key)));
  const web=Object.fromEntries(webFields.map(key=>[key,env[key]]));
  if(Object.values({...api,...web}).some(value=>typeof value!=='string'||/[\r\n\0]/.test(value)))throw Error('VPS_CONFIGURATION_INVALID');
  return {api,web};
}
export async function runVpsSplit(args){
  let values;
  try{({values}=parseArgs({args,strict:true,options:{'env-file':{type:'string'},'api-out':{type:'string'},'web-out':{type:'string'}}}));}
  catch{return {ok:false,error:'EXPLICIT_ENV_AND_OUTPUTS_REQUIRED'};}
  if(!values['env-file']||!values['api-out']||!values['web-out'])return {ok:false,error:'EXPLICIT_ENV_AND_OUTPUTS_REQUIRED'};
  let split;
  try{const info=await lstat(values['env-file']);if(!info.isFile()||info.isSymbolicLink()||info.size>1024*1024)throw Error();
    split=splitVpsInventory(parseEnv(await readFile(values['env-file'],'utf8')));
  }catch{return {ok:false,error:'VPS_CONFIGURATION_INVALID'};}
  const handles=[],paths=[values['api-out'],values['web-out']];let complete=false;
  try{
    for(const path of paths)handles.push(await open(path,'wx',0o600));
    for(const [index,record] of [split.api,split.web].entries())await handles[index].writeFile(Object.entries(record).map(([key,value])=>key+'='+value).join('\n')+'\n');
    complete=true;return {ok:true};
  }catch{return {ok:false,error:'OUTPUT_EXISTS_OR_UNWRITABLE'};}
  finally{
    await Promise.allSettled(handles.map(file=>file.close()));
    if(!complete)await Promise.allSettled(handles.map((_file,index)=>rm(paths[index],{force:true})));
  }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  const result=await runVpsSplit(process.argv.slice(2));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
}
