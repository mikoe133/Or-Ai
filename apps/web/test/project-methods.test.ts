import {test} from 'node:test';
import assert from 'node:assert/strict';
import {methodCustomization,methodParameters,effectiveMethod,methodInputKey} from '../src/admin/project-methods-model.js';
import type {MethodCandidate} from '../src/admin/project-methods-api.js';

test('typed method parameters preserve zero and false while rejecting ambiguous or invalid inputs',()=>{
 const value=methodCustomization([{key:'count',type:'number',value:'0'},{key:'gentle',type:'boolean',value:'false'},{key:'audience',type:'text',value:'沟通中的参与者'}],'  保留具体观察。  ');
 assert.deepEqual(value,{parameters:{audience:'沟通中的参与者',count:0,gentle:false},instructions:'保留具体观察。'});
 for(const rows of [[{key:'count',type:'number' as const,value:''}],[{key:'count',type:'number' as const,value:'Infinity'}],
  [{key:'gentle',type:'boolean' as const,value:'yes'}],[{key:'Bad_key',type:'text' as const,value:'x'}],
  [{key:'same',type:'text' as const,value:'a'},{key:'same',type:'text' as const,value:'b'}]])assert.throws(()=>methodCustomization(rows,''));
 assert.throws(()=>methodCustomization(Array.from({length:41},(_,i)=>({key:'p-'+i,type:'text',value:'x'})),''));
 assert.throws(()=>methodCustomization([],'x'.repeat(8001)));
});
test('effective method preview is deterministic for parameter order and keeps the source text unchanged',()=>{
 const base={version:{manifest:{instructions:'固定基础正文。'}}} as MethodCandidate;
 const a=[{key:'z',type:'number' as const,value:'3'},{key:'a',type:'text' as const,value:'具体'}],b=[...a].reverse();
 assert.equal(effectiveMethod(base,a,'本商品要求。'),effectiveMethod(base,b,'本商品要求。'));
 assert.equal(base.version.manifest.instructions,'固定基础正文。');
 assert.ok(effectiveMethod(base,a,'本商品要求。').endsWith('本商品补充方法\n本商品要求。'));
 assert.equal(effectiveMethod(base,[],''),'固定基础正文。');
});
test('a fixed customization can be opened for another version without changing value types',()=>{
 const original={audience:'参与者',count:0,gentle:false};assert.deepEqual(methodCustomization(methodParameters(original),'').parameters,original);
});
test('input identities distinguish explicit locators and fixed revisions',()=>{
 const revisionId='a';assert.notEqual(methodInputKey({revisionId,locator:{kind:'question',questionId:'intro'}}),methodInputKey({revisionId,locator:{kind:'block',blockId:'intro'}}));
 assert.notEqual(methodInputKey({revisionId,locator:{kind:'whole'}}),methodInputKey({revisionId:'b',locator:{kind:'whole'}}));
});
