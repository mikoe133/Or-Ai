import assert from 'node:assert/strict';
import {test} from 'node:test';
import {findPublishedProduct,type AdminProduct} from '../src/admin/api.js';

test('adopting a saved cover can locate its current product beyond the first page',async()=>{
  const pages:number[]=[];
  const match={id:'00000000-0000-4000-8000-000000000001',currentVersionId:'version-51'} as AdminProduct;
  const product=await findPublishedProduct('version-51',async (page:number)=>{
    pages.push(page);return {items:page===2?[match]:[],page,pageSize:50,total:51};
  });
  assert.equal(product,match);assert.deepEqual(pages,[1,2]);
});

test('a cover for a non-current or unlisted version reports no eligible product',async()=>{
  let reads=0;
  assert.equal(await findPublishedProduct('old-version',async (page:number)=>{reads++;return {items:[],page,pageSize:50,total:0};}),undefined);
  assert.equal(reads,1);
});
