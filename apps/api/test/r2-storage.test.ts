import 'reflect-metadata';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,readdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {R2AssetStorage} from '../src/operations/r2-asset-storage';
import {loadConfiguration,type AppConfiguration} from '../src/config/configuration';
import {storedFileContent} from '../src/operations/files.service';
import {createServer} from 'node:http';
import {S3Client} from '@aws-sdk/client-s3';

const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZkAAAAASUVORK5CYII=','base64');
type Entry={bytes:Buffer;etag:string;checksum:string};
type Command={input:Record<string,unknown>;constructor:{name:string}};
class Objects {
  readonly data=new Map<string,Entry>();readonly calls:string[]=[];
  corrupt=false;partial=false;changed=false;fail=false;badMetadata=false;lastBody:Readable|undefined;
  async send(command:Command) {
    const input=command.input,key=String(input.Key);this.calls.push(command.constructor.name);
    if(this.fail)throw Error('PRIVATE_PROVIDER_SECRET');
    const stored=this.data.get(key);
    switch(command.constructor.name){
      case 'PutObjectCommand': {
        assert.equal(input.IfNoneMatch,'*');
        if(stored)throw Object.assign(Error('PRIVATE_PROVIDER_SECRET'),{$metadata:{httpStatusCode:412}});
        const chunks:Buffer[]=[];for await(const chunk of input.Body as AsyncIterable<Uint8Array>)chunks.push(Buffer.from(chunk));
        const bytes=Buffer.concat(chunks);assert.equal(input.ContentLength,bytes.length);
        const metadata=input.Metadata as {sha256:string};assert.equal(metadata.sha256,sha(bytes));
        this.data.set(key,{bytes,etag:'"'+sha(bytes)+'"',checksum:metadata.sha256});return {ETag:'"'+sha(bytes)+'"'};
      }
      case 'HeadObjectCommand':
        if(!stored)throw Object.assign(Error('PRIVATE_PROVIDER_SECRET'),{$metadata:{httpStatusCode:404}});
        return {ContentLength:stored.bytes.length,ETag:stored.etag,Metadata:{sha256:stored.checksum}};
      case 'GetObjectCommand': {
        assert.ok(stored);assert.equal(input.IfMatch,stored.etag);
        if(this.changed)throw Object.assign(Error('PRIVATE_PROVIDER_SECRET'),{$metadata:{httpStatusCode:412}});
        const bytes=this.corrupt?Buffer.alloc(stored.bytes.length):this.partial?stored.bytes.subarray(1):stored.bytes;
        this.lastBody=Readable.from([bytes]);
        return {Body:this.lastBody,ContentLength:stored.bytes.length,ETag:stored.etag,Metadata:{sha256:this.badMetadata?'0'.repeat(64):stored.checksum}};
      }
      case 'DeleteObjectCommand':this.data.delete(key);return {};
      default:throw Error('Unexpected storage operation');
    }
  }
  destroy(){}
}
async function setup(options:{spoolBytes?:number;maxFiles?:number}={}) {
  const directory=await mkdtemp(join(tmpdir(),'orai-r2-'));
  const config=loadConfiguration({APP_ENV:'test',DATABASE_URL:'postgresql://local:local@127.0.0.1/orai_test',ASSET_DIRECTORY:directory});
  const configuration={...config,assets:{...config.assets!,driver:'r2',r2:{accountId:'a'.repeat(32),endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',
    bucket:'orai-test',accessKeyId:'b'.repeat(32),secretAccessKey:'c'.repeat(64),spoolDirectory:directory,spoolMaxBytes:options.spoolBytes??1024*1024,
    spoolMaxFiles:options.maxFiles??2,requestTimeoutMs:1000}}} as unknown as AppConfiguration;
  const objects=new Objects(),storage=new R2AssetStorage(configuration,objects as never);
  return {directory,configuration,objects,storage,async close(){storage.onModuleDestroy();await rm(directory,{recursive:true,force:true});}};
}
const key=()=>randomUUID()+'.blob';
const file=(bytes:Buffer,mimeType='image/png')=>({byteSize:bytes.length,checksum:sha(bytes),mimeType});
async function collect(source:AsyncIterable<Uint8Array>){const chunks:Buffer[]=[];for await(const chunk of source)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks);}

test('R2 stages validated bytes privately and conditionally creates a fixed object without overwriting history',async()=>{
  const f=await setup();try{const id=key();await f.storage.receive(id,Readable.from([png]),file(png));
    assert.deepEqual(f.objects.data.get(id)?.bytes,png);assert.deepEqual(await readdir(f.directory),[]);
    await assert.rejects(f.storage.receive(id,Readable.from([png]),file(png)),{code:'CONFLICT'});
    assert.deepEqual(f.objects.data.get(id)?.bytes,png);assert.deepEqual(await readdir(f.directory),[]);
  }finally{await f.close();}
});
test('R2 rejects invalid media, digest, size and object keys before provider writes and removes temporary bytes',async()=>{
  const f=await setup();try{for(const expected of [{...file(png),checksum:'0'.repeat(64)},{...file(png),byteSize:png.length-1},{...file(png),byteSize:png.length+1},file(Buffer.from('invalid'))])
      await assert.rejects(f.storage.receive(key(),Readable.from([png]),expected));
    await assert.rejects(f.storage.receive('../escape',Readable.from([png]),file(png)));
    assert.equal(f.objects.data.size,0);assert.deepEqual(await readdir(f.directory),[]);
  }finally{await f.close();}
});
test('R2 reads exact objects with an immutable ETag and bounded random access, then deletes temporary bytes on close',async()=>{
  const f=await setup();try{const id=key();await f.storage.receive(id,Readable.from([png]),file(png));
    const handle=await f.storage.read(id);assert.equal((await handle.stat()).size,png.length);
    const bytes=Buffer.alloc(8);assert.equal((await handle.read(bytes,0,8,0)).bytesRead,8);assert.deepEqual(bytes,png.subarray(0,8));
    assert.deepEqual(await collect(handle.createReadStream({autoClose:false,start:10,end:20})),png.subarray(10,21));
    await handle.close();await handle.close();assert.deepEqual(await readdir(f.directory),[]);
    assert.ok(f.objects.calls.includes('HeadObjectCommand'));assert.ok(f.objects.calls.includes('GetObjectCommand'));
  }finally{await f.close();}
});
test('R2 streams the existing authorized Range response and releases its spool after end or client disconnect',async()=>{
  const f=await setup();try{const id=key();await f.storage.receive(id,Readable.from([png]),file(png));
    const response=await storedFileContent(f.storage,{storageKey:id,byteSize:png.length,mimeType:'image/png',originalName:'cover.png'},'bytes=4-15');
    assert.equal(response.range,`bytes 4-15/${png.length}`);assert.deepEqual(await collect(response.stream),png.subarray(4,16));
    await new Promise<void>(resolve=>setImmediate(resolve));assert.deepEqual(await readdir(f.directory),[]);
    const next=await storedFileContent(f.storage,{storageKey:id,byteSize:png.length,mimeType:'image/png',originalName:'cover.png'});
    next.stream.destroy();await new Promise<void>(resolve=>next.stream.once('close',resolve));
    await new Promise<void>(resolve=>setImmediate(resolve));assert.deepEqual(await readdir(f.directory),[]);
  }finally{await f.close();}
});
test('R2 validates real image/video metadata, references and retained HTML originals using the existing inspectors',async()=>{
  const f=await setup();try{
    const id=key();await f.storage.receive(id,Readable.from([png]),file(png));const image=await f.storage.inspect(id,png.length);
    assert.equal(image.width,1);assert.equal(image.height,1);assert.equal(image.checksum,sha(png));
    const video=await readFile(join(process.cwd(),'test/fixtures/preview.mp4')),videoId=key();await f.storage.receive(videoId,Readable.from([video]),file(video,'video/mp4'));
    const inspected=await f.storage.inspect(videoId,video.length);assert.ok(inspected.width>0&&inspected.durationMs!>0);
    const markdown=Buffer.from('保留专业参考资料。'),ref=key();await f.storage.receive(ref,Readable.from([markdown]),file(markdown,'text/markdown'));
    assert.equal((await f.storage.inspectReference(ref,markdown.length,'text/markdown')).checksum,sha(markdown));
    const html=Buffer.from('<!doctype html><html>Retained only</html>'),original=key();await f.storage.receiveOriginal(original,Readable.from([html]),file(html,'text/html'));
    assert.equal((await f.storage.inspectOriginal(original,html.length,'text/html')).checksum,sha(html));assert.deepEqual(await readdir(f.directory),[]);
  }finally{await f.close();}
});
test('R2 refuses truncated/corrupt/changed objects and sanitizes provider failures without leaving a spool',async()=>{
  const f=await setup();try{const id=key();await f.storage.receive(id,Readable.from([png]),file(png));
    for(const mode of ['corrupt','partial','changed','fail'] as const){f.objects[mode]=true;
      await assert.rejects(f.storage.read(id),(error:unknown)=>{assert.equal(String(error).includes('PRIVATE_PROVIDER_SECRET'),false);return true;});
      f.objects[mode]=false;assert.deepEqual(await readdir(f.directory),[]);
    }
    await f.storage.remove(id);await f.storage.remove(id);assert.equal(f.objects.data.size,0);
  }finally{await f.close();}
});
test('R2 enforces shared byte/file leases while a read is open and recovers capacity after close',async()=>{
  const f=await setup({spoolBytes:png.length,maxFiles:1});try{const id=key();await f.storage.receive(id,Readable.from([png]),file(png));
    const open=await f.storage.read(id);await assert.rejects(f.storage.read(id),{code:'SERVICE_UNAVAILABLE'});
    await assert.rejects(f.storage.receive(key(),Readable.from([png]),file(png)),{code:'SERVICE_UNAVAILABLE'});
    await open.close();const next=await f.storage.read(id);await next.close();assert.deepEqual(await readdir(f.directory),[]);
  }finally{await f.close();}
});

test('production R2 configuration requires exact account, bucket and credentials without accepting an arbitrary network endpoint',()=>{
  const env={APP_ENV:'production',DATABASE_URL:'postgresql://app:local@db.example/orai',DATABASE_SSL_MODE:'verify-full',
    APP_PUBLIC_ORIGIN:'https://meetmyworld.com',CSRF_SIGNING_KEY:'k'.repeat(43),ASSET_STORAGE_DRIVER:'r2',
    R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'orai-private',R2_ACCESS_KEY_ID:'b'.repeat(32),R2_SECRET_ACCESS_KEY:'c'.repeat(64),
    UPLOAD_INGRESS_BODY_BYTES:'90000000',UPLOAD_REQUEST_ENVELOPE_BYTES:'0',ASSET_UPLOAD_TIMEOUT_MS:'360000'};
  const configuration=loadConfiguration(env);assert.equal(configuration.assets?.driver,'r2');
  for(const name of ['R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY']){
    const bad:Record<string,string|undefined>={...env};delete bad[name];assert.throws(()=>loadConfiguration(bad));
  }
  assert.throws(()=>loadConfiguration({...env,R2_ACCOUNT_ID:'127.0.0.1/PRIVATE_PROVIDER_SECRET'}));
});

test('R2 destroys a provider response body when its metadata fails before the checksum pass',async()=>{
  const f=await setup();try{const id=key();await f.storage.receive(id,Readable.from([png]),file(png));f.objects.badMetadata=true;
    await assert.rejects(f.storage.read(id));assert.equal(f.objects.lastBody?.destroyed,true);assert.deepEqual(await readdir(f.directory),[]);
  }finally{await f.close();}
});

test('the pinned AWS SDK performs signed conditional PUT, HEAD, GET and DELETE against a real loopback S3 protocol server',async()=>{
  const f=await setup(),entries=new Map<string,Entry>(),requests:string[]=[];
  const server=createServer((request,response)=>{void(async()=>{
    const path=new URL(request.url!,'http://127.0.0.1').pathname;assert.ok(path.startsWith('/orai-test/'));
    assert.match(String(request.headers.authorization),/^AWS4-HMAC-SHA256 Credential=b{32}\//);
    assert.ok(request.headers['x-amz-date']);assert.ok(request.headers['x-amz-content-sha256']);requests.push(request.method!);
    const saved=entries.get(path);
    if(request.method==='PUT'){
      assert.equal(request.headers['if-none-match'],'*');if(saved){response.writeHead(412).end();return;}
      const bytes=await collect(request);assert.equal(bytes.length,Number(request.headers['content-length']));assert.equal(sha(bytes),request.headers['x-amz-meta-sha256']);
      const entry={bytes,etag:'"'+sha(bytes)+'"',checksum:sha(bytes)};entries.set(path,entry);response.writeHead(200,{etag:entry.etag}).end();return;
    }
    if(request.method==='DELETE'){entries.delete(path);response.writeHead(204).end();return;}
    if(!saved){response.writeHead(404).end();return;}
    if(request.method==='GET')assert.equal(request.headers['if-match'],saved.etag);
    response.writeHead(200,{'content-length':saved.bytes.length,etag:saved.etag,'x-amz-meta-sha256':saved.checksum});
    response.end(request.method==='HEAD'?undefined:saved.bytes);
  })().catch(()=>{response.writeHead(500).end();});});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const client=new S3Client({region:'auto',endpoint:'http://127.0.0.1:'+address.port,forcePathStyle:true,maxAttempts:1,
    credentials:{accessKeyId:'b'.repeat(32),secretAccessKey:'c'.repeat(64)},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
  const storage=new R2AssetStorage(f.configuration,client);
  try{const id=key();await storage.receive(id,Readable.from([png]),file(png));
    assert.equal((await storage.inspect(id,png.length)).checksum,sha(png));
    const response=await storedFileContent(storage,{storageKey:id,byteSize:png.length,mimeType:'image/png',originalName:'cover.png'},'bytes=-12');
    assert.deepEqual(await collect(response.stream),png.subarray(-12));
    await assert.rejects(storage.receive(id,Readable.from([png]),file(png)),{code:'CONFLICT'});
    await storage.remove(id);assert.equal(entries.size,0);assert.deepEqual(new Set(requests),new Set(['PUT','HEAD','GET','DELETE']));
    assert.deepEqual(await readdir(f.directory),[]);
  }finally{storage.onModuleDestroy();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await f.close();}
});
