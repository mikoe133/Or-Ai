import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderVpsNginx,runVpsRender} from '../vps-routing.mjs';
const fixture=()=>({APP_PUBLIC_ORIGIN:'https://store.unit.test',UPLOAD_INGRESS_BODY_BYTES:'90000000',ASSET_UPLOAD_TIMEOUT_MS:'360000'});
test('VPS route rendering uses the fixed API upstream, canonical HTTPS host and explicit byte/timeout limits',()=>{
  const text=renderVpsNginx(fixture());
  assert.match(text,/client_max_body_size 90000000;/);assert.match(text,/proxy_read_timeout 360s;/);
  assert.match(text,/proxy_pass http:\/\/api:4100;/);assert.match(text,/server_name store\.unit\.test;/);
  assert.match(text,/https:\/\/store\.unit\.test\$request_uri/);
});
test('VPS route rendering refuses unknown upload limits, malicious origins and non-integral timeouts without reflecting inputs',()=>{
  for(const change of [{UPLOAD_INGRESS_BODY_BYTES:''},{UPLOAD_INGRESS_BODY_BYTES:'100MB'},
    {UPLOAD_INGRESS_BODY_BYTES:'90000000; PRIVATE_SENTINEL'},{APP_PUBLIC_ORIGIN:'http://store.unit.test'},
    {APP_PUBLIC_ORIGIN:'https://store.unit.test/PRIVATE_SENTINEL'},{APP_PUBLIC_ORIGIN:'https://127.0.0.1'},
    {APP_PUBLIC_ORIGIN:'https://store.unit.test:4433'},{ASSET_UPLOAD_TIMEOUT_MS:'1200.5'}]){
    assert.throws(()=>renderVpsNginx({...fixture(),...change}),error=>{assert.equal(String(error).includes('PRIVATE_SENTINEL'),false);return true;});
  }
});
test('VPS renderer reads only an explicit ordinary env file, never executes it or overwrites an existing result',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'orai-vps-render-'));
  try{const input=join(directory,'production.env'),output=join(directory,'nginx.conf');
    await writeFile(input,Object.entries({...fixture(),R2_SECRET_ACCESS_KEY:'PRIVATE_SENTINEL'}).map(([k,v])=>k+'='+v).join('\n'),{mode:0o600});
    assert.equal((await runVpsRender(['--env-file',input,'--out',output])).ok,true);
    const before=await readFile(output,'utf8');assert.equal(before.includes('PRIVATE_SENTINEL'),false);
    assert.deepEqual(await runVpsRender(['--env-file',input,'--out',output]),{ok:false,error:'OUTPUT_EXISTS_OR_UNWRITABLE'});
    assert.equal(await readFile(output,'utf8'),before);assert.deepEqual(await runVpsRender([]),{ok:false,error:'EXPLICIT_ENV_AND_OUTPUT_REQUIRED'});
  }finally{await rm(directory,{recursive:true,force:true});}
});
