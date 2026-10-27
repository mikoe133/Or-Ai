import { Inject, Injectable } from '@nestjs/common';
import { constants } from 'node:fs';
import { mkdir, lstat, realpath, open, unlink, type FileHandle } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { ApiException } from '../common/http-errors';
import { imageSize } from 'image-size';
import { Input, CustomSource, MP4, WEBM } from 'mediabunny';
import { referenceContent } from './reference-content';
import { inspectOriginal } from './original-content';
import type { Readable } from 'node:stream';

export interface InspectedFile { byteSize: number; checksum: string; mimeType: string }
export interface VerifiedMedia extends InspectedFile { width: number; height: number; durationMs: number | null }
export interface StoredAssetFile {
  stat(): Promise<{size: number; isFile(): boolean}>;
  read(buffer: Buffer, offset: number, length: number, position: number): Promise<{bytesRead: number; buffer: Buffer}>;
  createReadStream(options?: {start?: number; end?: number; autoClose?: boolean}): Readable;
  close(): Promise<void>;
}
export function persistentAssetStorageConfigured(configuration: AppConfiguration) {
  return configuration.assets?.driver === 'r2' && !!configuration.assets.r2 ||
    configuration.assets?.driver === 'local' && configuration.environment !== 'production';
}
export abstract class AssetStorage {
  abstract receive(key: string, source: AsyncIterable<Uint8Array>, expected: InspectedFile): Promise<void>;
  abstract inspect(key: string, maxBytes: number): Promise<VerifiedMedia>;
  async receiveOriginal(_key: string, _source: AsyncIterable<Uint8Array>, _expected: InspectedFile): Promise<void> {
    throw new ApiException('SERVICE_UNAVAILABLE', '原件存储尚未配置', 503);
  }
  async inspectOriginal(key: string, maxBytes: number, mimeType: string): Promise<InspectedFile> {
    const file = await this.read(key); try { return await inspectOriginal(file,maxBytes,mimeType); } finally { await file.close(); }
  }
  async inspectReference(key:string,maxBytes:number,mimeType:string):Promise<InspectedFile> {
    if(mimeType.startsWith('image/')) return this.inspect(key,maxBytes);
    const file=await this.read(key),inspection=new Inspection(mimeType);
    try {for await(const chunk of file.createReadStream({autoClose:false}))inspection.add(chunk as Buffer,maxBytes);return inspection.result();}finally{await file.close();}
  }
  abstract read(key: string): Promise<StoredAssetFile>;
  abstract remove(key: string): Promise<void>;
}

export function mediaType(header: Buffer, tail: Buffer, size: number): string | undefined {
  if (size >= 67 && header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
    header.toString('ascii',12,16) === 'IHDR' && header.readUInt32BE(16) > 0 && header.readUInt32BE(20) > 0 &&
    header.readUInt32BE(16) <= 16_384 && header.readUInt32BE(20) <= 16_384 &&
    tail.subarray(-12).equals(Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130]))) return 'image/png';
  if (size >= 32 && header[0] === 255 && header[1] === 216 && header[2] === 255 && tail.subarray(-2).equals(Buffer.from([255,217]))) return 'image/jpeg';
  if (size >= 30 && header.toString('ascii',0,4) === 'RIFF' && header.readUInt32LE(4) + 8 === size &&
    header.toString('ascii',8,12) === 'WEBP' && ['VP8 ','VP8L','VP8X'].includes(header.toString('ascii',12,16))) return 'image/webp';
  if (size >= 32 && header.toString('ascii',4,8) === 'ftyp' && header.readUInt32BE(0) >= 16 && header.readUInt32BE(0) <= size &&
    /isom|iso[2-9]|mp4[12]|avc1|M4V |dash/.test(header.toString('ascii',8,Math.min(header.readUInt32BE(0),header.length)))) return 'video/mp4';
  if (size >= 64 && header.subarray(0,4).equals(Buffer.from([26,69,223,163])) && header.includes(Buffer.from('webm')) &&
    ['V_VP8','V_VP9','V_AV1'].some(value => header.includes(Buffer.from(value)))) return 'video/webm';
  return undefined;
}

class Inspection {
  bytes = 0; header = Buffer.alloc(0); tail = Buffer.alloc(0); readonly hash = createHash('sha256');
  readonly referenceChunks:Buffer[]|undefined;
  constructor(private readonly referenceMime?:string){if(referenceMime && !/^(image|video)\//.test(referenceMime))this.referenceChunks=[];}
  add(chunk: Uint8Array, max: number) {
    this.bytes += chunk.byteLength;
    if (this.bytes > max) throw new ApiException('VALIDATION_ERROR', '实际文件大小超出上传限制', 400);
    const bytes = Buffer.from(chunk);
    if(this.referenceChunks){if(this.bytes>5*1024*1024)throw new ApiException('VALIDATION_ERROR','参考文件超出大小限制',400);this.referenceChunks.push(bytes);}
    if (this.header.length < 4096) this.header = Buffer.concat([this.header, bytes.subarray(0,4096 - this.header.length)]);
    this.tail = Buffer.concat([this.tail, bytes.subarray(-4096)]).subarray(-4096);
    this.hash.update(bytes);
  }
  result(): InspectedFile {
    const mimeType = this.referenceChunks ? referenceContent(Buffer.concat(this.referenceChunks),this.referenceMime!) : mediaType(this.header, this.tail, this.bytes);
    if (!mimeType) throw new ApiException('VALIDATION_ERROR', '文件内容不是支持的图片或视频格式', 400);
    return { byteSize: this.bytes, mimeType, checksum: this.hash.digest('hex') };
  }
}

export async function writeInspectedFile(file: FileHandle, source: AsyncIterable<Uint8Array>, expected: InspectedFile, original = false) {
  const inspection = new Inspection(expected.mimeType);
  const rawHash = createHash('sha256'); let rawBytes = 0;
  for await (const chunk of source) {
    if (original) { rawBytes += chunk.byteLength; if(rawBytes>expected.byteSize)throw new ApiException('VALIDATION_ERROR','原件超过声明大小',400); rawHash.update(chunk); }
    else inspection.add(chunk, expected.byteSize);
    let offset = 0;
    while (offset < chunk.byteLength) {
      const result = await file.write(chunk, offset, chunk.byteLength - offset);
      if (!result.bytesWritten) throw new Error('File write failed');
      offset += result.bytesWritten;
    }
  }
  const actual = original ? {byteSize:rawBytes,checksum:rawHash.digest('hex'),mimeType:expected.mimeType} : inspection.result();
  if (actual.byteSize !== expected.byteSize || actual.mimeType !== expected.mimeType || actual.checksum !== expected.checksum) throw new ApiException('VALIDATION_ERROR', '文件大小、类型或摘要与上传声明不一致', 400);
  await file.sync();
}

export async function inspectStoredMedia(file: StoredAssetFile, maxBytes: number): Promise<VerifiedMedia> {
  const inspection = new Inspection();
      for await (const chunk of file.createReadStream({ autoClose: false })) inspection.add(chunk as Buffer, maxBytes);
      const result = inspection.result();
      const deadline = Date.now() + 15000;
      let bytesRead = 0;
      const read = async (start: number, end: number) => {
        if (Date.now() > deadline || (bytesRead += end - start) > maxBytes * 4 || end - start > maxBytes)
          throw new Error('Media metadata budget exceeded');
        const data = Buffer.alloc(end - start);
        let offset = 0;
        while (offset < data.length) {
          const value = await file.read(data, offset, data.length - offset, start + offset);
          if (!value.bytesRead) throw new Error('Incomplete media');
          offset += value.bytesRead;
        }
        return data;
      };
      try {
        let width: number, height: number, durationMs: number | null = null;
        if (result.mimeType.startsWith('image/')) {
          const dimensions = imageSize(await read(0, result.byteSize));
          width = dimensions.width; height = dimensions.height;
        } else {
          const input = new Input({ formats: [MP4, WEBM], source: new CustomSource({
            getSize: () => result.byteSize, read, maxCacheSize: 1024 * 1024,
          }) });
          try {
            const track = await input.getPrimaryVideoTrack();
            if (!track) throw new Error('No video track');
            width = Math.round(await track.getDisplayWidth()); height = Math.round(await track.getDisplayHeight());
            const duration = await track.computeDuration();
            // A one-packet WebM can omit packet duration. Its container still
            // carries the finite recorded duration.
            durationMs = Math.ceil((duration > 0 ? duration : await track.getDurationFromMetadata() ?? 0) * 1000);
          } finally { input.dispose(); }
        }
        if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= 16384) ||
          durationMs !== null && (!Number.isSafeInteger(durationMs) || durationMs < 1 || durationMs > 86400000)) throw new Error('Invalid media geometry');
        return { ...result, width, height, durationMs };
      } catch { throw new ApiException('VALIDATION_ERROR', '无法读取媒体尺寸或时长，请使用完整且支持的文件', 400); }
}

@Injectable()
export class LocalAssetStorage extends AssetStorage {
  constructor(@Inject(APP_CONFIG) private readonly configuration: AppConfiguration) { super(); }
  private async location(key: string) {
    const settings = this.configuration.assets;
    if (!settings || settings.driver !== 'local' || this.configuration.environment === 'production') throw new ApiException('SERVICE_UNAVAILABLE', '持久化文件存储尚未配置', 503);
    if (!/^[0-9a-f-]{36}\.blob$/.test(key)) throw new ApiException('VALIDATION_ERROR', '文件引用不正确', 400);
    await mkdir(settings.directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(settings.directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ApiException('SERVICE_UNAVAILABLE', '文件存储目录不可用', 503);
    return join(await realpath(settings.directory), key);
  }
  async receiveOriginal(key: string, source: AsyncIterable<Uint8Array>, expected: InspectedFile) {
    return this.receive(key,source,expected,true);
  }
  async receive(key: string, source: AsyncIterable<Uint8Array>, expected: InspectedFile, original = false) {
    const path = await this.location(key);
    let file: FileHandle | undefined;
    try {
      file = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
      await writeInspectedFile(file, source, expected, original);
    } catch (error) {
      if (file) { await file.close(); file = undefined; await unlink(path).catch(() => undefined); }
      if (error instanceof ApiException) throw error;
      throw new ApiException('SERVICE_UNAVAILABLE', '文件上传未完成，请重新申请上传', 503);
    } finally { await file?.close(); }
  }
  async read(key: string) {
    let file: FileHandle | undefined;
    try {
      file = await open(await this.location(key), constants.O_RDONLY | constants.O_NOFOLLOW);
      if (!(await file.stat()).isFile()) throw new Error('Not a file');
      return file;
    } catch (error) {
      await file?.close();
      if (error instanceof ApiException) throw error;
      throw new ApiException('SERVICE_UNAVAILABLE', '文件暂不可读取', 503);
    }
  }
  async inspect(key: string, maxBytes: number) {
    const file = await this.read(key);
    try { return await inspectStoredMedia(file, maxBytes); } finally { await file.close(); }
  }
  async remove(key: string) {
    try { await unlink(await this.location(key)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
