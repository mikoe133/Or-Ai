import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkFrontendBuild} from '../frontend-build-config.mjs';
const fixture=()=>({VITE_APP_PUBLIC_ORIGIN:'https://store.unit.test',VITE_SUPABASE_URL:'https://auth.unit.test',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'a'.repeat(24)});
test('frontend image build validates its three public inputs through the actual browser Auth parser',async()=>{
  const result=await checkFrontendBuild(fixture());assert.deepEqual(result,{valid:true,usesActualBrowserAuthParser:true});
  const anon='a.'+Buffer.from('{"role":"anon"}').toString('base64url')+'.b';
  assert.equal((await checkFrontendBuild({...fixture(),VITE_SUPABASE_PUBLISHABLE_KEY:anon})).valid,true);
});
test('frontend image build rejects secret keys, unknown public fields and unsafe origins before Vite embeds them',async()=>{
  const service='a.'+Buffer.from('{"role":"service_role"}').toString('base64url')+'.b';
  for(const change of [{VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_PRIVATE_SENTINEL'},
    {VITE_SUPABASE_PUBLISHABLE_KEY:service},{VITE_APP_PUBLIC_ORIGIN:'http://store.unit.test'},
    {VITE_SUPABASE_URL:'https://127.0.0.1'},{VITE_UNKNOWN_SECRET:'PRIVATE_SENTINEL'},{VITE_SUPABASE_PUBLISHABLE_KEY:''}])
    await assert.rejects(checkFrontendBuild({...fixture(),...change}),error=>!String(error).includes('PRIVATE_SENTINEL'));
});
