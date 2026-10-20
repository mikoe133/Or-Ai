import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { generateKeyPairSync, randomUUID, sign, verify } from 'node:crypto';
import { loadConfiguration } from '../src/config/configuration';
import { SupabaseAuthGateway } from '../src/accounts/supabase-auth.gateway';
import { ApiException } from '../src/common/http-errors';

const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),userId=randomUUID(),sessionId=randomUUID();
const publicKey={...pair.publicKey.export({format:'jwk'}),kid:'t06-key',alg:'ES256',use:'sig'};
let server:Server,url:string,unverified=false,banned=false,unavailable=false,userReads=0,refreshReads=0,logoutReads=0;
let invalidRefresh=false,stall=false;
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
function token(overrides:Record<string,unknown>={},header:Record<string,unknown>={}){
  const body={iss:url+'/auth/v1',aud:'authenticated',role:'authenticated',sub:userId,session_id:sessionId,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...overrides};
  const input=encode({alg:'ES256',kid:'t06-key',typ:'JWT',...header})+'.'+encode(body);
  return input+'.'+sign('sha256',Buffer.from(input),{key:pair.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
}
before(async()=>{
  server=createServer(async(request,response)=>{
    response.setHeader('content-type','application/json');
    if(request.url==='/auth/v1/.well-known/jwks.json'){response.end(JSON.stringify({keys:[publicKey]}));return;}
    if(request.url==='/auth/v1/token?grant_type=refresh_token'){
      refreshReads++;if(stall)return;
      if(unavailable){response.statusCode=503;response.end('{}');return;}
      let body='';for await(const chunk of request)body+=String(chunk);
      if(invalidRefresh||JSON.parse(body).refresh_token!=='fixture_refresh_credential'){response.statusCode=400;response.end(JSON.stringify({msg:'Invalid refresh token',error_code:'refresh_token_not_found'}));return;}
      response.end(JSON.stringify({access_token:token(),refresh_token:'rotated_fixture_credential',expires_in:3600,token_type:'bearer',
        user:{id:userId,aud:'authenticated',role:'authenticated',email:'fixture@example.test',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}}}));return;
    }
    if(request.url==='/auth/v1/logout?scope=local'){
      logoutReads++;if(unavailable){response.statusCode=503;response.end('{}');return;}
      response.statusCode=banned?401:204;response.end(banned?JSON.stringify({msg:'Unauthorized'}):undefined);return;
    }
    if(request.url==='/auth/v1/user'){
      userReads++;if(unavailable){response.statusCode=503;response.end(JSON.stringify({msg:'Unavailable'}));return;}
      const raw=request.headers.authorization?.slice(7)||'',parts=raw.split('.');
      let valid=false;try{valid=parts.length===3&&verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:pair.publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2]!,'base64url'));}catch{}
      if(!valid||banned){response.statusCode=401;response.end(JSON.stringify({msg:'Unauthorized'}));return;}
      response.end(JSON.stringify({id:userId,aud:'authenticated',role:'authenticated',email:'fixture@example.test',email_confirmed_at:unverified?null:'2026-01-01T00:00:00.000Z',created_at:'2026-01-01T00:00:00.000Z',app_metadata:{},user_metadata:{role:'admin',email_verified:true}}));return;
    }
    response.statusCode=404;response.end('{}');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');url='http://127.0.0.1:'+address.port;
});
after(()=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());}));
function configuration(overrides:NodeJS.ProcessEnv={}){
  return loadConfiguration({APP_ENV:'test',DATABASE_URL:'postgresql://orai_app@127.0.0.1:55432/orai_test_t06',SUPABASE_URL:url,
    SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'p'.repeat(40),AUTH_SESSION_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64url'),...overrides});
}
const fails=(code:string)=>(error:unknown)=>error instanceof ApiException&&error.code===code;

test('real SDK verifies ES256 against JWKS and reads fresh remote identity without trusting editable roles',async()=>{
  const gateway=new SupabaseAuthGateway(configuration()),result=await gateway.verify(token());
  assert.equal(result.supabaseUserId,userId);assert.equal(result.supabaseSessionId,sessionId);assert.equal(result.emailVerified,true);
  assert.equal('role' in result,false);assert.equal('email' in result,false);assert.ok(userReads>0);
});
test('invalid signatures, expiry, issuer, audience, subject, session and algorithms cannot become identities',async()=>{
  const gateway=new SupabaseAuthGateway(configuration());
  for(const value of [token({exp:1}),token({exp:Number.MAX_SAFE_INTEGER}),token({iss:'https://other.example/auth/v1'}),token({aud:'service_role'}),token({sub:'invalid'}),token({session_id:'invalid'}),token({role:'service_role'}),token({}, {alg:'none'}),'invalid'])await assert.rejects(gateway.verify(value),fails('AUTH_REQUIRED'));
  const valid=token(),parts=valid.split('.');parts[1]=encode({sub:randomUUID()});await assert.rejects(gateway.verify(parts.join('.')),fails('AUTH_REQUIRED'));
});
test('remote verification and account state are authoritative even while the JWT is still signed and unexpired',async()=>{
  const gateway=new SupabaseAuthGateway(configuration());
  unverified=true;try{assert.equal((await gateway.verify(token())).emailVerified,false);}finally{unverified=false;}
  banned=true;try{await assert.rejects(gateway.verify(token()),fails('AUTH_REQUIRED'));}finally{banned=false;}
  unavailable=true;try{await assert.rejects(gateway.verify(token()),fails('SERVICE_UNAVAILABLE'));}finally{unavailable=false;}
});
test('auth may be unconfigured locally, but partial settings, credentials in URLs and secret keys are refused',async()=>{
  assert.equal(configuration({SUPABASE_URL:undefined,SUPABASE_PUBLISHABLE_KEY:undefined,AUTH_SESSION_ENCRYPTION_KEY:undefined}).auth,null);
  const disabled=new SupabaseAuthGateway(configuration({SUPABASE_URL:undefined,SUPABASE_PUBLISHABLE_KEY:undefined,AUTH_SESSION_ENCRYPTION_KEY:undefined}));await assert.rejects(disabled.verify(token()),fails('SERVICE_UNAVAILABLE'));
  for(const overrides of [{SUPABASE_PUBLISHABLE_KEY:undefined},{AUTH_SESSION_ENCRYPTION_KEY:'short'},{AUTH_SESSION_ENCRYPTION_KEY:'B'.repeat(43)},{SUPABASE_URL:'http://remote.example'},{SUPABASE_URL:'https://secret:password@example.test'},{SUPABASE_URL:'https://example.test/?redirect=1'},{SUPABASE_PUBLISHABLE_KEY:'sb_secret_'+'s'.repeat(40)}])assert.throws(()=>configuration(overrides));
});
test('refresh uses the official Auth protocol plus SDK signature checks, and local-scope logout uses the ordinary user JWT',async()=>{
  const gateway=new SupabaseAuthGateway(configuration());
  try{
    const refreshed=await gateway.refresh('fixture_refresh_credential');assert.equal(refreshed.identity.supabaseUserId,userId);assert.equal(refreshed.identity.supabaseSessionId,sessionId);
    assert.equal(refreshed.refreshToken==='rotated_fixture_credential',true);assert.ok(refreshReads>0);
    await gateway.logout(refreshed.accessToken);assert.ok(logoutReads>0);
    invalidRefresh=true;try{await assert.rejects(gateway.refresh('fixture_refresh_credential'),fails('AUTH_REQUIRED'));}finally{invalidRefresh=false;}
    banned=true;try{await assert.rejects(gateway.logout(refreshed.accessToken),fails('AUTH_REQUIRED'));}finally{banned=false;}
  }finally{await gateway.onModuleDestroy();}
});
test('refresh failures and stalled network requests produce bounded retryable failures, without the SDK retry loop',async()=>{
  const gateway=new SupabaseAuthGateway(configuration({AUTH_REQUEST_TIMEOUT_MS:'120'}));
  try{
    const before=refreshReads;unavailable=true;
    try{await assert.rejects(gateway.refresh('fixture_refresh_credential'),fails('SERVICE_UNAVAILABLE'));await assert.rejects(gateway.logout(token()),fails('SERVICE_UNAVAILABLE'));}
    finally{unavailable=false;}
    assert.equal(refreshReads-before,1);
    stall=true;const started=Date.now();try{await assert.rejects(gateway.refresh('fixture_refresh_credential'),fails('SERVICE_UNAVAILABLE'));}finally{stall=false;}
    assert.ok(Date.now()-started<2000);
  }finally{await gateway.onModuleDestroy();}
});
