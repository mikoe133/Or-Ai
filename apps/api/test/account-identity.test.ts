import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { AccountIdentityService } from '../src/accounts/account-identity.service';
import { AccountTokenCipher } from '../src/accounts/account-token-cipher';
import { SupabaseAuthGateway, type SupabaseIdentity } from '../src/accounts/supabase-auth.gateway';
import { DatabaseService } from '../src/database/database.service';
import { ApiException } from '../src/common/http-errors';
import { DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

let fixture:Awaited<ReturnType<typeof createLocalFixture>>,service:AccountIdentityService;
const remoteId=randomUUID(),supabaseSessionId=randomUUID();let verified=true,expired=false,invalidExpiry=false;
before(async()=>{
  fixture=await createLocalFixture('t06');
  // This isolated unit adapter models already-verified Auth facts. Signature,
  // issuer and fresh Auth HTTP verification have their own real-SDK tests.
  const gateway={verify:async():Promise<SupabaseIdentity>=>({supabaseUserId:remoteId,supabaseSessionId,expiresAt:invalidExpiry?new Date(NaN):new Date(Date.now()+(expired?-1:60_000)),emailVerified:verified})};
  service=new AccountIdentityService({client:fixture.runtime.client} as DatabaseService,gateway as unknown as SupabaseAuthGateway,fixture.configuration);
});
after(async()=>{await fixture?.close();});
const denies=(code:string)=>(error:unknown)=>error instanceof ApiException&&error.code===code;

test('verified stable Supabase ids create one ordinary business user and opaque authorization, with no email or password',async()=>{
  const actors=await Promise.all(Array.from({length:5},()=>service.authorize('fixture-token')));
  assert.equal(new Set(actors.map(actor=>actor.userId)).size,1);assert.equal(await fixture.runtime.client.user.count({where:{supabaseUserId:remoteId}}),1);
  const user=await service.fresh(actors[0]!);assert.equal(user.role,'USER');assert.equal(user.supabaseUserId,remoteId);assert.equal(user.scope,'DEMO');
  assert.equal('email' in user,false);assert.equal('password' in user,false);assert.equal('token' in actors[0]!,false);
  assert.throws(()=>service.identity({userId:user.id,scope:'DEMO',emailVerified:true} as any),denies('FORBIDDEN'));
});
test('email status and database disabled state are checked freshly, rather than trusting seed scenarios or copied objects',async()=>{
  verified=false;try{const actor=await service.authorize('fixture-token');assert.equal(actor.emailVerified,false);await assert.rejects(service.requireVerified(actor),denies('EMAIL_UNVERIFIED'));}finally{verified=true;}
  const actor=await service.authorize('fixture-token');await fixture.runtime.client.user.update({where:{id:actor.userId},data:{disabledAt:new Date()}});
  try{await assert.rejects(service.fresh(actor),denies('AUTH_REQUIRED'));await assert.rejects(service.authorize('fixture-token'),denies('AUTH_REQUIRED'));}finally{await fixture.runtime.client.user.update({where:{id:actor.userId},data:{disabledAt:null}});}
  expired=true;try{await assert.rejects(service.authorize('fixture-token'),denies('AUTH_REQUIRED'));}finally{expired=false;}
  invalidExpiry=true;try{await assert.rejects(service.authorize('fixture-token'),denies('AUTH_REQUIRED'));}finally{invalidExpiry=false;}
});
test('role checks come from the current business row and cannot be supplied by the account object',async()=>{
  const actor=await service.authorize('fixture-token');await assert.rejects(service.requireAdmin(actor),denies('FORBIDDEN'));
  await fixture.owner.client.user.update({where:{id:actor.userId},data:{role:'ADMIN'}});
  try{assert.equal((await service.requireAdmin(actor)).role,'ADMIN');await fixture.owner.client.user.update({where:{id:actor.userId},data:{role:'USER'}});await assert.rejects(service.requireAdmin(actor),denies('FORBIDDEN'));}
  finally{await fixture.owner.client.user.update({where:{id:actor.userId},data:{role:'USER'}});}
  await assert.rejects(service.fresh({userId:DemoIdentityScenarios.admin.id,scope:'DEMO',emailVerified:true} as any),denies('FORBIDDEN'));
});
test('AES-GCM protects server refresh credentials with fresh nonces and identity-bound authenticated data',()=>{
  const cipher=new AccountTokenCipher(randomBytes(32).toString('base64url')),secret=randomBytes(48).toString('base64url');
  const first=cipher.seal(secret,'session-1:refresh'),second=cipher.seal(secret,'session-1:refresh');assert.notEqual(first,second);assert.equal(first.includes(secret),false);assert.equal(cipher.open(first,'session-1:refresh')===secret,true);
  assert.throws(()=>cipher.open(first,'session-2:refresh'));assert.throws(()=>new AccountTokenCipher(randomBytes(32).toString('base64url')).open(first,'session-1:refresh'));
  const parts=first.split('.');parts[3]=Buffer.alloc(16).toString('base64url');assert.throws(()=>cipher.open(parts.join('.'),'session-1:refresh'));assert.throws(()=>cipher.open('invalid','session-1:refresh'));
});
