import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm,mkdir,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderVpsNginx} from '../vps-routing.mjs';
import {gunzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../../',import.meta.url));
const docker=args=>execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),...args],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}).trim();
const nginx='nginx:1.28.3-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236';
const frontendImage=process.env.ORAI_VPS_WEB_IMAGE;
if(frontendImage)assert.match(frontendImage,/^[a-z0-9][a-z0-9/:._@-]+$/);
const stub=String.raw`
const http=require('node:http');
http.createServer((request,response)=>{
  if(request.url==='/api/error'){response.writeHead(422,{'content-type':'application/json'}).end('{"error":"EXPECTED"}');return;}
  if(request.url==='/api/large'){response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({text:'private response '.repeat(4000)}));return;}
  if(request.url==='/api/file'){
    response.writeHead(206,{'content-type':'video/mp4','content-range':'bytes 2-5/10','content-length':'4','accept-ranges':'bytes','cache-control':'public, max-age=3600'});
    response.end('2345');return;
  }
  const chunks=[];request.on('data',chunk=>chunks.push(chunk));request.on('end',()=>{
    response.writeHead(200,{'content-type':'application/json','set-cookie':'session=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax'});
    response.end(JSON.stringify({url:request.url,method:request.method,headers:request.headers,body:Buffer.concat(chunks).toString()}));
  });
}).listen(4100,'0.0.0.0');
`;
let clientContainer;
const requester=String.raw`
const {port,path,options}=JSON.parse(process.argv[1]),transport=require(options.secure===false?'node:http':'node:https');
const request=transport.request({hostname:'web',port,path,method:options.method??'GET',servername:options.servername??'store.unit.test',rejectUnauthorized:false,
  headers:{host:options.host??'store.unit.test',...options.headers},timeout:5000},response=>{
  const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.once('end',()=>console.log(JSON.stringify({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString(),bodyBase64:Buffer.concat(chunks).toString('base64')})));
});request.once('error',error=>{console.error(error.code);process.exitCode=1;});request.once('timeout',()=>request.destroy(Error('Local proxy timeout')));
request.end(options.bodyBase64?Buffer.from(options.bodyBase64,'base64'):undefined);
`;
async function request(port,path,options={}){
  const {body,...safe}=options;
  return JSON.parse(docker(['exec',clientContainer,'node','-e',requester,JSON.stringify({port,path,options:{...safe,...(body?{bodyBase64:Buffer.from(body).toString('base64')}:{})}})]));
}
test('real unprivileged Nginx forwards private API transport and Range while serving SPA routes on the same HTTPS origin',async()=>{
  await mkdir(join(root,'.local'),{recursive:true,mode:0o700});
  const directory=await mkdtemp(join(root,'.local/vps-routing-')),suffix=process.pid+'-'+Date.now(),network='orai-route-'+suffix,api='orai-route-api-'+suffix,web='orai-route-web-'+suffix,seed=web+'-seed';
  const volumes=['config','tls','html'].map(kind=>'orai-route-'+kind+'-'+suffix);
  try{
    await chmod(directory,0o755);await mkdir(join(directory,'www'),{mode:0o755});await mkdir(join(directory,'tls'),{mode:0o755});
    await writeFile(join(directory,'www/index.html'),'<!doctype html><title>SPA fixture</title>');
    await mkdir(join(directory,'www/assets'));
    const compressible='export const fixture = '+JSON.stringify('public static resource '.repeat(4000))+';';
    await writeFile(join(directory,'www/assets/compression-fixture.js'),compressible);
    for(const folder of ['www','www/assets','tls'])await chmod(join(directory,folder),0o755);
    for(const file of ['www/index.html','www/assets/compression-fixture.js'])await chmod(join(directory,file),0o644);
    await writeFile(join(directory,'nginx.conf'),renderVpsNginx({APP_PUBLIC_ORIGIN:'https://store.unit.test',UPLOAD_INGRESS_BODY_BYTES:'1024',ASSET_UPLOAD_TIMEOUT_MS:'360000'}));
    await chmod(join(directory,'nginx.conf'),0o644);
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(directory,'tls/privkey.pem'),'-out',join(directory,'tls/fullchain.pem'),'-days','1','-subj','/CN=store.unit.test','-addext','subjectAltName=DNS:store.unit.test,DNS:www.store.unit.test'],{stdio:'ignore'});
    await chmod(join(directory,'tls/privkey.pem'),0o644);
    await chmod(join(directory,'tls/fullchain.pem'),0o644);
    for(const volume of volumes)docker(['volume','create',volume]);
    const mounts=['/etc/nginx','/run/tls','/usr/share/nginx/html'];
    docker(['create','--pull=never',...(frontendImage?['--platform','linux/amd64']:[]),'--name',seed,'--network','none',
      ...volumes.flatMap((volume,index)=>['--mount','type=volume,src='+volume+',dst='+mounts[index]]),
      '--entrypoint','nginx',frontendImage??nginx,'-v']);
    docker(['cp',join(directory,'nginx.conf'),seed+':/etc/nginx/nginx.conf']);
    for(const file of ['fullchain.pem','privkey.pem'])docker(['cp',join(directory,'tls',file),seed+':/run/tls/'+file]);
    docker(['cp',frontendImage?join(directory,'www/assets'):join(directory,'www/.'),seed+':/usr/share/nginx/html/']);
    docker(['network','create','--internal',network]);
    docker(['run','-d','--name',api,'--network',network,'--network-alias','api','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','128m','--cpus','.5','--pids-limit','32','--user','node','node:24.21.0-bookworm-slim','node','-e',stub]);
    docker(['create','--pull=never',...(frontendImage?['--platform','linux/amd64']:[]),'--name',web,'--network',network,'--network-alias','web','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m,mode=1777','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','128m','--cpus','.5','--pids-limit','32','--user','101:101',
      ...volumes.flatMap((volume,index)=>['--mount','type=volume,src='+volume+',dst='+mounts[index]+',readonly']),
      '--entrypoint','nginx',frontendImage??nginx,'-c','/etc/nginx/nginx.conf','-g','daemon off;']);
    docker(['start',web]);
    if(docker(['inspect',web,'--format','{{.State.Running}}'])!=='true'){
      const logs=spawnSync(process.execPath,[join(root,'scripts/docker.mjs'),'logs',web],{cwd:root,encoding:'utf8',timeout:5000});
      throw Error('Local Nginx startup: '+docker(['inspect',web,'--format','{{json .State}}'])+' '+logs.stdout+logs.stderr);
    }
    clientContainer=api;const tls=8443,plain=8080;
    let ready=false,lastReady='';for(let count=0;count<30;count++){try{const result=await request(tls,'/');lastReady='HTTP '+result.status;if(result.status===200){ready=true;break;}}catch(error){lastReady=String(error.stderr??error.message).slice(-500);}await new Promise(resolve=>setTimeout(resolve,100));}
    if(!ready){const diagnostic=spawnSync(process.execPath,[join(root,'scripts/docker.mjs'),'logs',web],{cwd:root,encoding:'utf8'});
      assert.fail('local proxy did not become ready: '+lastReady+' '+(diagnostic.stdout+diagnostic.stderr).slice(-1800));}
    const spa=await request(tls,'/admin/content/synthetic?tab=skills');assert.equal(spa.status,200);assert.match(spa.body,frontendImage?/<div id="root">/:/SPA fixture/);assert.match(spa.headers['cache-control'],/no-cache/);
    if(frontendImage){
      const asset=/src="(\/assets\/[^"?]+\.js)"/.exec(spa.body);assert.ok(asset,'actual frontend entry asset is missing');
      const built=await request(tls,asset[1]);assert.equal(built.status,200);assert.match(built.headers['content-type'],/javascript/);
    }
    const compressed=await request(tls,'/assets/compression-fixture.js',{headers:{'accept-encoding':'gzip'}});
    assert.equal(compressed.headers['content-encoding'],'gzip','public renderer JS must use negotiated transfer compression');
    assert.match(compressed.headers.vary,/Accept-Encoding/i);
    assert.equal(gunzipSync(Buffer.from(compressed.bodyBase64,'base64')).toString(),compressible);
    const plainAsset=await request(tls,'/assets/compression-fixture.js');assert.equal(plainAsset.body,compressible);
    const echo=await request(tls,'/api/echo?revision=7',{method:'POST',headers:{'content-type':'application/json',cookie:'session=synthetic',authorization:'Bearer SYNTHETIC',origin:'https://store.unit.test','x-csrf-token':'SYNTHETIC','x-forwarded-proto':'http','x-forwarded-for':'8.8.8.8'},body:'{"draft":true}'});
    assert.equal(echo.status,200);const body=JSON.parse(echo.body);assert.equal(body.url,'/api/echo?revision=7');assert.equal(body.headers.cookie,'session=synthetic');
    assert.equal(body.headers.authorization,'Bearer SYNTHETIC');assert.equal(body.headers['x-csrf-token'],'SYNTHETIC');assert.equal(body.headers.origin,'https://store.unit.test');
    assert.equal(body.headers['x-forwarded-proto'],'https');assert.notEqual(body.headers['x-forwarded-for'],'8.8.8.8');assert.match(echo.headers['set-cookie'][0],/HttpOnly; Secure/);
    assert.equal((await request(tls,'/api/error')).status,422);
    const range=await request(tls,'/api/file',{headers:{range:'bytes=2-5'}});assert.equal(range.status,206);assert.equal(range.body,'2345');
    assert.equal(range.headers['content-range'],'bytes 2-5/10');assert.match(range.headers['cache-control'],/no-store/);
    const privateCompressed=await request(tls,'/api/large',{headers:{'accept-encoding':'gzip'}});assert.equal(privateCompressed.headers['content-encoding'],undefined);
    assert.equal(JSON.parse(privateCompressed.body).text.length,'private response '.repeat(4000).length);
    assert.equal((await request(tls,'/assets/missing.js')).status,404);
    assert.equal((await request(tls,'/api/echo',{method:'POST',headers:{'content-length':'1025'},body:Buffer.alloc(1025)})).status,413);
    const redirect=await request(plain,'/auth/callback?code=SYNTHETIC',{secure:false});assert.equal(redirect.status,308);assert.equal(redirect.headers.location,'https://store.unit.test/auth/callback?code=SYNTHETIC');
    const www=await request(tls,'/account',{host:'www.store.unit.test',servername:'www.store.unit.test'});assert.equal(www.status,308);assert.equal(www.headers.location,'https://store.unit.test/account');
    await assert.rejects(request(tls,'/',{host:'unexpected.unit.test',servername:'unexpected.unit.test'}));
    const user=docker(['inspect',web,'--format','{{.Config.User}}']);assert.equal(user,'101:101');
    console.log(JSON.stringify({checks:frontendImage?15:14,actualFrontendImage:frontendImage??null,network:'internal_isolated',https:'synthetic_local_certificate',proxyUser:user,realCloudConnections:0,newImageBuilds:0}));
  }finally{
    clientContainer=undefined;
    for(const name of [web,api,seed]){try{docker(['rm','-f',name]);}catch{}}
    for(const volume of volumes){try{docker(['volume','rm',volume]);}catch{}}
    try{docker(['network','rm',network]);}catch{}
    await rm(directory,{recursive:true,force:true});
  }
});
