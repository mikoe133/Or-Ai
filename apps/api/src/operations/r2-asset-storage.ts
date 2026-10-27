import {S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {constants} from 'node:fs';
import {mkdir,lstat,realpath,mkdtemp,open,rm,type FileHandle} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import type {AppConfiguration,AssetConfiguration} from '../config/configuration';
import {ApiException} from '../common/http-errors';
import {AssetStorage,inspectStoredMedia,writeInspectedFile,type InspectedFile,type StoredAssetFile} from './asset-storage';

const unavailable=()=>new ApiException('SERVICE_UNAVAILABLE','文件存储暂不可用，请稍后重试',503);
type Temporary={file:FileHandle;close():Promise<void>};

/** Private fixed objects. Temporary disk is a bounded inspection/response cache, never the durable store. */
export class R2AssetStorage extends AssetStorage {
  private readonly settings:NonNullable<AssetConfiguration['r2']>;
  private readonly client:S3Client;
  private readonly maxObjectBytes:number;
  private bytes=0;private files=0;
  private readonly controllers=new Set<AbortController>();

  constructor(configuration:AppConfiguration,client?:S3Client) {
    super();
    if(configuration.assets?.driver!=='r2'||!configuration.assets.r2)throw unavailable();
    this.settings=configuration.assets.r2;
    this.maxObjectBytes=Math.max(configuration.assets.maxImageBytes,configuration.assets.maxVideoBytes,100*1024*1024);
    this.client=client??new S3Client({region:'auto',endpoint:this.settings.endpoint,forcePathStyle:true,
      credentials:{accessKeyId:this.settings.accessKeyId,secretAccessKey:this.settings.secretAccessKey},
      maxAttempts:2,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
  }
  onModuleDestroy(){for(const controller of this.controllers)controller.abort();this.client.destroy();}
  private key(key:string){if(!/^[0-9a-f-]{36}\.blob$/.test(key))throw new ApiException('VALIDATION_ERROR','文件引用不正确',400);return key;}
  private size(value:unknown):number {
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1||value>this.maxObjectBytes)throw unavailable();
    return value;
  }
  private async request<T>(work:(signal:AbortSignal)=>Promise<T>):Promise<T> {
    const controller=new AbortController();this.controllers.add(controller);
    const deadline=setTimeout(()=>controller.abort(),this.settings.requestTimeoutMs);deadline.unref();
    try{return await work(controller.signal);}
    catch(error){
      if(error instanceof ApiException)throw error;
      if((error as {$metadata?:{httpStatusCode?:number}})?.$metadata?.httpStatusCode===412)
        throw new ApiException('CONFLICT','文件已存在或读取期间发生变化，请核对原引用',409);
      throw unavailable();
    }finally{clearTimeout(deadline);this.controllers.delete(controller);}
  }
  private async temporary(byteSize:number):Promise<Temporary> {
    if(this.files>=this.settings.spoolMaxFiles||this.bytes+byteSize>this.settings.spoolMaxBytes)throw unavailable();
    this.files++;this.bytes+=byteSize;
    let directory:string|undefined,file:FileHandle|undefined,released=false,closing:Promise<void>|undefined;
    const release=()=>{if(!released){released=true;this.files--;this.bytes-=byteSize;}};
    try {
      await mkdir(this.settings.spoolDirectory,{recursive:true,mode:0o700});
      const info=await lstat(this.settings.spoolDirectory);
      if(!info.isDirectory()||info.isSymbolicLink()||(info.mode&0o077)!==0)throw unavailable();
      directory=await mkdtemp(join(await realpath(this.settings.spoolDirectory),'object-'));
      file=await open(join(directory,'bytes'),constants.O_CREAT|constants.O_EXCL|constants.O_RDWR|constants.O_NOFOLLOW,0o600);
      const ownedFile=file,ownedDirectory=directory;
      return {file:ownedFile,close(){return closing??=(async()=>{
        try{await ownedFile.close();}finally{try{await rm(ownedDirectory,{recursive:true,force:true});}finally{release();}}
      })();}};
    }catch(error){try{await file?.close();if(directory)await rm(directory,{recursive:true,force:true});}finally{release();}throw error;}
  }
  async receiveOriginal(key:string,source:AsyncIterable<Uint8Array>,expected:InspectedFile){return this.receive(key,source,expected,true);}
  async receive(key:string,source:AsyncIterable<Uint8Array>,expected:InspectedFile,original=false){
    this.key(key);
    if(!Number.isSafeInteger(expected.byteSize)||expected.byteSize<1||expected.byteSize>this.maxObjectBytes||!/^[a-f0-9]{64}$/.test(expected.checksum))
      throw new ApiException('VALIDATION_ERROR','文件大小或摘要不正确',400);
    return this.request(async signal=>{
      const temporary=await this.temporary(expected.byteSize);
      let body:Readable|undefined;
      try {
        await writeInspectedFile(temporary.file,source,expected,original);
        body=temporary.file.createReadStream({start:0,autoClose:false});
        await this.client.send(new PutObjectCommand({Bucket:this.settings.bucket,Key:key,Body:body,ContentLength:expected.byteSize,
          ContentType:expected.mimeType,Metadata:{sha256:expected.checksum},CacheControl:'private, no-store',IfNoneMatch:'*'}),{abortSignal:signal});
      }finally{body?.destroy();await temporary.close();}
    });
  }
  async read(key:string):Promise<StoredAssetFile>{
    this.key(key);
    return this.request(async signal=>{
      const head=await this.client.send(new HeadObjectCommand({Bucket:this.settings.bucket,Key:key}),{abortSignal:signal});
      const size=this.size(head.ContentLength),checksum=head.Metadata?.sha256;
      if(!head.ETag||!checksum||!/^[a-f0-9]{64}$/.test(checksum))throw unavailable();
      const temporary=await this.temporary(size);
      let body:Readable|undefined;
      try {
        const object=await this.client.send(new GetObjectCommand({Bucket:this.settings.bucket,Key:key,IfMatch:head.ETag}),{abortSignal:signal});
        if(object.ContentLength!==size||object.ETag!==head.ETag||object.Metadata?.sha256!==checksum||!(object.Body instanceof Readable))throw unavailable();
        body=object.Body;let bytes=0;const hash=createHash('sha256');
        for await(const chunk of body){
          const data=Buffer.from(chunk);bytes+=data.length;if(bytes>size)throw unavailable();hash.update(data);
          let offset=0;while(offset<data.length){const result=await temporary.file.write(data,offset,data.length-offset);if(!result.bytesWritten)throw unavailable();offset+=result.bytesWritten;}
        }
        if(bytes!==size||hash.digest('hex')!==checksum)throw unavailable();
        await temporary.file.sync();
        return this.handle(temporary);
      }catch(error){body?.destroy();await temporary.close();throw error;}
    });
  }
  private handle(temporary:Temporary):StoredAssetFile {
    let closed=false;
    const handle:StoredAssetFile={
      stat:()=>temporary.file.stat(),
      read:(buffer,offset,length,position)=>temporary.file.read(buffer,offset,length,position),
      async close(){closed=true;await temporary.close();},
      createReadStream(options={}){
        if(closed)throw unavailable();
        const autoClose=options.autoClose!==false,source=temporary.file.createReadStream({start:0,...options,autoClose:false});
        const stream=new Readable({
          read(){source.resume();},
          destroy(error,callback){
            // FileHandle streams close their handle when explicitly destroyed, even with autoClose:false.
            // Inspectors still need that handle for random metadata reads after the checksum pass.
            if(autoClose)source.destroy();else source.pause();
            void(autoClose?handle.close():Promise.resolve()).then(()=>callback(error),()=>callback(error??unavailable()));
          },
        });
        source.pause();
        source.on('data',chunk=>{if(!stream.push(chunk))source.pause();});
        source.once('error',error=>stream.destroy(error));
        source.once('end',()=>{void(autoClose?handle.close():Promise.resolve()).then(()=>stream.push(null),error=>stream.destroy(error));});
        return stream;
      },
    };
    return handle;
  }
  async inspect(key:string,maxBytes:number){const file=await this.read(key);try{return await inspectStoredMedia(file,maxBytes);}finally{await file.close();}}
  async remove(key:string){this.key(key);return this.request(async signal=>{await this.client.send(new DeleteObjectCommand({Bucket:this.settings.bucket,Key:key}),{abortSignal:signal});});}
}
