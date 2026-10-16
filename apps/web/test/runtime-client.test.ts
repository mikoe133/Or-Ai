import assert from 'node:assert/strict';
import {test} from 'node:test';
import {QueryClient} from '@tanstack/react-query';
import {IdSchema} from '@orai/contracts';
import {ApiClient,ClientError} from '../src/api/client.js';
import {MutationIntent} from '../src/api/intent.js';
import {clearPrivateQueries} from '../src/api/privacy.js';
import {catalogSearch,changeCatalogSearch,shareSummary} from '../src/business/model.js';
const id='00000000-0000-4000-8000-000000000001';
const token='1'.repeat(100);
const error=(code:string,status=403)=>new Response(JSON.stringify({error:{code,message:'可展示说明',requestId:'safe-request'}}),{status});
const context=()=>new Response(JSON.stringify({authenticated:false,csrfToken:token,sessionExpiresAt:null}),{headers:{'content-type':'application/json'}});
const fail=(code:string)=>(value:unknown)=>value instanceof ClientError&&value.code===code;

test('API client coalesces CSRF bootstrap and refreshes it once while preserving the exact mutation intent',async()=>{
 const calls:{path:string;body:unknown;init?:RequestInit}[]=[];let writes=0;
 const api=new ApiClient(async(input,init)=>{const path=String(input);calls.push({path,body:init?.body,init});if(path==='/api/session/context')return context();writes++;return writes===1?error('CSRF_INVALID'):new Response(JSON.stringify(id));});
 const body={requestId:id};assert.equal(await api.request('/api/probe',IdSchema,{method:'POST',body}),id);
 assert.equal(calls.filter(value=>value.path==='/api/session/context').length,2);
 assert.deepEqual(calls.filter(value=>value.path==='/api/probe').map(value=>value.body),[JSON.stringify(body),JSON.stringify(body)]);
 assert.equal(calls.at(-1)?.init?.credentials,'same-origin');assert.equal(calls.at(-1)?.init?.cache,'no-store');
 assert.equal(new Headers(calls.at(-1)?.init?.headers).get('X-CSRF-Token'),token);
 await api.request('/api/probe',IdSchema,{method:'POST',body});assert.equal(calls.filter(value=>value.path==='/api/session/context').length,2);
});

test('network, rate-limit, permission and malformed responses never blindly replay a write or expose diagnostics',async()=>{
 for(const[response,code]of[[error('RATE_LIMITED',429),'RATE_LIMITED'],[error('FORBIDDEN'),'FORBIDDEN'],[new Response('<sql>private</sql>',{status:500}),'SERVICE_UNAVAILABLE'],[new Response('{}'),'INVALID_RESPONSE']]as const){
  let writes=0;const api=new ApiClient(async input=>String(input)==='/api/session/context'?context():(writes++,response.clone()));
  await assert.rejects(api.request('/api/probe',IdSchema,{method:'POST',body:{requestId:id}}),fail(code));assert.equal(writes,1);
 }
 const api=new ApiClient(async()=>{throw new Error('PRIVATE_PROVIDER_DIAGNOSTICS');});
 await assert.rejects(api.request('/api/probe',IdSchema),value=>fail('NETWORK_ERROR')(value)&&!(value as Error).message.includes('PRIVATE'));
 const limited=new ApiClient(async()=>new Response(JSON.stringify({error:{code:'RATE_LIMITED',message:'稍后再试',requestId:'safe'}}),{status:429,headers:{'Retry-After':'19'}}));
 await assert.rejects(limited.request('/api/probe',IdSchema),value=>value instanceof ClientError&&value.retryAfterSeconds===19);
 await assert.rejects(api.request('https://foreign.example/api',IdSchema),fail('VALIDATION_ERROR'));
});

test('late private replies from a prior identity cannot populate the current page',async()=>{
 let epoch=0;let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
 const api=new ApiClient(async()=>{await pending;return new Response(JSON.stringify(id));},()=>epoch);
 const result=api.request('/api/reports/'+id,IdSchema);epoch++;release();await assert.rejects(result,fail('SESSION_CHANGED'));
});

test('identity changes cancel and remove private and account queries while public catalog remains shareable',async()=>{
 const client=new QueryClient();client.setQueryData(['public','catalog'],{title:'public'});client.setQueryData(['private','report'],{text:'PRIVATE_REPORT'});client.setQueryData(['account-context'],{id});
 await clearPrivateQueries(client);assert.equal(client.getQueryData(['private','report']),undefined);assert.equal(client.getQueryData(['account-context']),undefined);assert.deepEqual(client.getQueryData(['public','catalog']),{title:'public'});client.clear();
});

test('an uncertain mutation reuses its ID only for identical values; new values get a new intent',()=>{
 const intent=new MutationIntent();const first=intent.for({optionId:'often',expectedRevision:1});assert.equal(intent.for({optionId:'often',expectedRevision:1}).requestId,first.requestId);
 assert.notEqual(intent.for({optionId:'rarely',expectedRevision:1}).requestId,first.requestId);intent.reset();assert.notEqual(intent.for({optionId:'often',expectedRevision:1}).requestId,first.requestId);
});

test('catalog URLs preserve filters and pagination across reload while filter changes reset only the page',()=>{
 const params=new URLSearchParams('q=关系&category=relationships&tags=demo,cooperation&sort=recommended&page=3&pageSize=1');
 assert.equal(catalogSearch(params).page,3);const changed=changeCatalogSearch(params,{category:'work'});assert.equal(changed.get('q'),'关系');assert.equal(changed.get('tags'),'demo,cooperation');assert.equal(changed.get('page'),'1');
 assert.throws(()=>catalogSearch(new URLSearchParams('scope=live')));assert.throws(()=>catalogSearch(new URLSearchParams('page=-1')));
});

test('share exports allow only explicit result summary fields and preserve a missing score as null',()=>{
 const summary=shareSummary({productName:'示例商品',resultLabel:'信息不足',totalScore:null,versionNumber:1,isDemo:true,disclaimer:'仅供自我观察',reportId:id,token:'PRIVATE_CODE_SENTINEL',answers:['PRIVATE_ANSWER_SENTINEL']} as never);
 assert.equal(summary.totalScore,null);assert.equal(JSON.stringify(summary).includes('PRIVATE'),false);assert.equal('reportId'in summary,false);
});
