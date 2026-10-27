import {createServer} from 'node:http';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

// Protocol-only identity and mailbox fixtures. Never imported by app code.
export async function authProtocolFixture({origin,actors}) {
 const proofs=new Map(),refreshes=new Map(),codes=new Map();
 const metrics={passwordLogins:0,pkceExchanges:0,passwordUpdates:0,mailRequests:0,actualMessagesSent:0};
 let latestMail=null,failLogin=false,failMail=false;
 const actor=email=>email==='operator@example.test'?actors.admin:actors.verified;
 const user=email=>({id:actor(email).supabaseUserId,email,aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}});
 function session(email){
  const identity={supabaseUserId:actor(email).supabaseUserId,supabaseSessionId:randomUUID(),expiresAt:new Date(Date.now()+3600000),emailVerified:true};
  const claims=Buffer.from(JSON.stringify({sub:identity.supabaseUserId,exp:Math.floor(identity.expiresAt.getTime()/1000),session_id:identity.supabaseSessionId})).toString('base64url');
  const accessToken='eyJhbGciOiJIUzI1NiJ9.'+claims+'.fixture_signature',refreshToken=randomBytes(40).toString('base64url');
  proofs.set(accessToken,{identity,email});refreshes.set(refreshToken,{accessToken,refreshToken});
  return {access_token:accessToken,refresh_token:refreshToken,expires_in:3600,token_type:'bearer',user:user(email)};
 }
 const server=createServer(async(req,res)=>{
  res.setHeader('content-type','application/json');res.setHeader('X-Supabase-Api-Version','2024-01-01');
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','*');
  res.setHeader('Access-Control-Allow-Methods','POST,GET,PUT,OPTIONS');res.setHeader('Access-Control-Expose-Headers','X-Supabase-Api-Version');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
  const url=new URL(req.url,'http://127.0.0.1');
  const fail=()=>{res.statusCode=400;res.end(JSON.stringify({error:'invalid_grant',code:'invalid_credentials',error_description:'Fixture authentication failed'}));};
  try{
   let body='';for await(const chunk of req){body+=chunk;assert.ok(body.length<=10000);}
   const data=body?JSON.parse(body):{};
   if(['/auth/v1/signup','/auth/v1/recover','/auth/v1/resend'].includes(url.pathname)){
    if(failMail){res.statusCode=429;res.end(JSON.stringify({code:'over_email_send_rate_limit',msg:'Fixture rate limit'}));return;}
    const email=String(data.email),redirectTo=url.searchParams.get('redirect_to')||data.redirect_to||data.options?.redirectTo;
    assert.ok(email.endsWith('@example.test'));assert.ok(redirectTo&&new URL(redirectTo).origin===origin);
    const code=randomBytes(20).toString('hex');
    latestMail={redirectTo,code,email,type:url.pathname==='/auth/v1/recover'?'recovery':'verification'};
    codes.set(code,{...latestMail,challenge:data.code_challenge});metrics.mailRequests++;
    res.end(JSON.stringify(url.pathname==='/auth/v1/signup'?user(email):{}));return;
   }
   if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'){
    metrics.passwordLogins++;if(failLogin)return fail();
    assert.ok(String(data.email).endsWith('@example.test'));res.end(JSON.stringify(session(data.email)));return;
   }
   if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='pkce'){
    const mail=codes.get(data.auth_code);
    if(!mail||!data.code_verifier||createHash('sha256').update(data.code_verifier).digest('base64url')!==mail.challenge)return fail();
    codes.delete(data.auth_code);metrics.pkceExchanges++;res.end(JSON.stringify(session(mail.email)));return;
   }
   if(url.pathname==='/auth/v1/user'){
    const proof=proofs.get(String(req.headers.authorization||'').replace(/^Bearer /,''));
    if(!proof)return fail();if(req.method==='PUT')metrics.passwordUpdates++;
    res.end(JSON.stringify(user(proof.email)));return;
   }
   if(url.pathname==='/auth/v1/logout'){res.writeHead(204).end();return;}
   res.writeHead(404).end('{}');
  }catch{res.statusCode=400;res.end(JSON.stringify({code:'invalid_request',msg:'Invalid fixture request'}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,metrics,mail:()=>latestMail,setLoginFailure:value=>{failLogin=value;},setMailFailure:value=>{failMail=value;},
  gateway:{verify:async token=>{const proof=proofs.get(token);assert.ok(proof);return proof.identity;},
   refresh:async token=>{const pair=refreshes.get(token);assert.ok(pair);return {...pair,identity:proofs.get(pair.accessToken).identity};},logout:async()=>{}},
  close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));proofs.clear();refreshes.clear();codes.clear();}
 };
}

