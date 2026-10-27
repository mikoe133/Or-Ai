import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm,mkdir,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderVpsNginx} from '../vps-routing.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const docker=args=>execFileSync(process.execPath,[join(root,'scripts/docker.mjs'),...args],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']}).trim();
const nginx='nginx:1.28.3-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236';
const stub=String.raw`
const http=require('node:http');
http.createServer((request,response)=>{
  if(request.url==='/api/error'){response.writeHead(422,{'content-type':'application/json'}).end('{"error":"EXPECTED"}');return;}
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
  const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.once('end',()=>console.log(JSON.stringify({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString()})));
});request.once('error',error=>{console.error(error.code);process.exitCode=1;});request.once('timeout',()=>request.destroy(Error('Local proxy timeout')));
request.end(options.bodyBase64?Buffer.from(options.bodyBase64,'base64'):undefined);
`;
async function request(port,path,options={}){
  const {body,...safe}=options;
  return JSON.parse(docker(['exec',clientContainer,'node','-e',requester,JSON.stringify({port,path,options:{...safe,...(body?{bodyBase64:Buffer.from(body).toString('base64')}:{})}})]));
}
test('real unprivileged Nginx forwards private API transport and Range while serving SPA routes on the same HTTPS origin',async()=>{
  await mkdir(join(root,'.local'),{recursive:true,mode:0o700});
  const directory=await mkdtemp(join(root,'.local/vps-routing-')),suffix=process.pid+'-'+Date.now(),network='orai-route-'+suffix,api='orai-route-api-'+suffix,web='orai-route-web-'+suffix,image='orai-route-fixture:'+suffix;
  try{
    await chmod(directory,0o755);await mkdir(join(directory,'www'),{mode:0o755});await mkdir(join(directory,'tls'),{mode:0o755});
    await writeFile(join(directory,'www/index.html'),'<!doctype html><title>SPA fixture</title>');
    await writeFile(join(directory,'nginx.conf'),renderVpsNginx({APP_PUBLIC_ORIGIN:'https://store.unit.test',UPLOAD_INGRESS_BODY_BYTES:'1024',ASSET_UPLOAD_TIMEOUT_MS:'360000'}));
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(directory,'tls/privkey.pem'),'-out',join(directory,'tls/fullchain.pem'),'-days','1','-subj','/CN=store.unit.test','-addext','subjectAltName=DNS:store.unit.test,DNS:www.store.unit.test'],{stdio:'ignore'});
    await chmod(join(directory,'tls/privkey.pem'),0o644);
    await writeFile(join(directory,'Dockerfile'),'FROM '+nginx+'\nCOPY nginx.conf /etc/nginx/nginx.conf\nCOPY www/ /usr/share/nginx/html/\nCOPY tls/ /run/tls/\n');
    docker(['build','-t',image,directory]);
    docker(['network','create','--internal',network]);
    docker(['run','-d','--name',api,'--network',network,'--network-alias','api','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','128m','--cpus','.5','--pids-limit','32','--user','node','node:24.21.0-bookworm-slim','node','-e',stub]);
    docker(['run','-d','--name',web,'--network',network,'--network-alias','web','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m,mode=1777','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','128m','--cpus','.5','--pids-limit','32','--user','101:101',
      '--entrypoint','nginx',image,'-g','daemon off;']);
    if(docker(['inspect',web,'--format','{{.State.Running}}'])!=='true'){
      const logs=spawnSync(process.execPath,[join(root,'scripts/docker.mjs'),'logs',web],{cwd:root,encoding:'utf8',timeout:5000});
      throw Error('Local Nginx startup: '+docker(['inspect',web,'--format','{{json .State}}'])+' '+logs.stdout+logs.stderr);
    }
    clientContainer=api;const tls=8443,plain=8080;
    let ready=false;for(let count=0;count<30;count++){try{if((await request(tls,'/')).status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
    assert.ok(ready,'local proxy did not become ready');
    const spa=await request(tls,'/admin/content/synthetic?tab=skills');assert.equal(spa.status,200);assert.match(spa.body,/SPA fixture/);assert.match(spa.headers['cache-control'],/no-cache/);
    const echo=await request(tls,'/api/echo?revision=7',{method:'POST',headers:{'content-type':'application/json',cookie:'session=synthetic',authorization:'Bearer SYNTHETIC',origin:'https://store.unit.test','x-csrf-token':'SYNTHETIC','x-forwarded-proto':'http','x-forwarded-for':'8.8.8.8'},body:'{"draft":true}'});
    assert.equal(echo.status,200);const body=JSON.parse(echo.body);assert.equal(body.url,'/api/echo?revision=7');assert.equal(body.headers.cookie,'session=synthetic');
    assert.equal(body.headers.authorization,'Bearer SYNTHETIC');assert.equal(body.headers['x-csrf-token'],'SYNTHETIC');assert.equal(body.headers.origin,'https://store.unit.test');
    assert.equal(body.headers['x-forwarded-proto'],'https');assert.notEqual(body.headers['x-forwarded-for'],'8.8.8.8');assert.match(echo.headers['set-cookie'][0],/HttpOnly; Secure/);
    assert.equal((await request(tls,'/api/error')).status,422);
    const range=await request(tls,'/api/file',{headers:{range:'bytes=2-5'}});assert.equal(range.status,206);assert.equal(range.body,'2345');
    assert.equal(range.headers['content-range'],'bytes 2-5/10');assert.match(range.headers['cache-control'],/no-store/);
    assert.equal((await request(tls,'/assets/missing.js')).status,404);
    assert.equal((await request(tls,'/api/echo',{method:'POST',headers:{'content-length':'1025'},body:Buffer.alloc(1025)})).status,413);
    const redirect=await request(plain,'/auth/callback?code=SYNTHETIC',{secure:false});assert.equal(redirect.status,308);assert.equal(redirect.headers.location,'https://store.unit.test/auth/callback?code=SYNTHETIC');
    const www=await request(tls,'/account',{host:'www.store.unit.test',servername:'www.store.unit.test'});assert.equal(www.status,308);assert.equal(www.headers.location,'https://store.unit.test/account');
    await assert.rejects(request(tls,'/',{host:'unexpected.unit.test',servername:'unexpected.unit.test'}));
    const user=docker(['inspect',web,'--format','{{.Config.User}}']);assert.equal(user,'101:101');
    console.log(JSON.stringify({checks:11,network:'internal_isolated',https:'synthetic_local_certificate',proxyUser:user,realCloudConnections:0}));
  }finally{
    clientContainer=undefined;
    for(const name of [web,api]){try{docker(['rm','-f',name]);}catch{}}
    try{docker(['network','rm',network]);}catch{}
    try{docker(['image','rm',image]);}catch{}
    await rm(directory,{recursive:true,force:true});
  }
});
