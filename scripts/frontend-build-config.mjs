import {pathToFileURL} from 'node:url';
import {publicOrigin} from './cloud-preflight-lib.mjs';
const publicFields=['VITE_APP_PUBLIC_ORIGIN','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'];
export async function checkFrontendBuild(env){
  const origin=publicOrigin(env.VITE_APP_PUBLIC_ORIGIN);
  if(!origin||!publicOrigin(env.VITE_SUPABASE_URL)||Object.keys(env).some(key=>key.startsWith('VITE_')&&!publicFields.includes(key)))
    throw Error('PUBLIC_FRONTEND_CONFIGURATION_INVALID');
  let authConfiguration;
  try{({authConfiguration}=await import('../apps/web/.test-build/src/auth/core.js'));}
  catch{throw Error('BROWSER_CONFIGURATION_VALIDATOR_BUILD_REQUIRED');}
  try{
    if(!authConfiguration({url:env.VITE_SUPABASE_URL,publishableKey:env.VITE_SUPABASE_PUBLISHABLE_KEY,appOrigin:env.VITE_APP_PUBLIC_ORIGIN,production:true},origin))throw Error();
  }catch{throw Error('PUBLIC_FRONTEND_CONFIGURATION_INVALID');}
  return {valid:true,usesActualBrowserAuthParser:true};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  try{console.log(JSON.stringify(await checkFrontendBuild(process.env)));}
  catch{console.log(JSON.stringify({valid:false,error:'PUBLIC_FRONTEND_CONFIGURATION_INVALID_OR_NOT_BUILT'}));process.exitCode=1;}
}
