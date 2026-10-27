import type { FileHandle } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ApiException } from '../common/http-errors';
import type { InspectedFile } from './asset-storage';

const invalid = () => new ApiException('VALIDATION_ERROR', '原件的容器结构、类型或大小不符合要求', 400);
async function range(file: FileHandle, start: number, size: number) {
  const bytes = Buffer.alloc(size); let offset = 0;
  while (offset < size) { const next = await file.read(bytes,offset,size-offset,start+offset); if (!next.bytesRead) throw invalid(); offset += next.bytesRead; }
  return bytes;
}
function utf8(bytes: Buffer) { try { return new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { throw invalid(); } }

// These originals are retained as downloads. They are never extracted, imported,
// served inline, evaluated, or described as a validated runtime implementation.
export async function inspectOriginal(file: FileHandle, maxBytes: number, mimeType: string): Promise<InspectedFile> {
  const stat = await file.stat(), size = stat.size;
  if (!stat.isFile() || size<1 || size>maxBytes || size>100*1024*1024) throw invalid();
  const hash = createHash('sha256'); let count = 0;
  for await (const chunk of file.createReadStream({autoClose:false,start:0})) {
    count += chunk.length; if (count>maxBytes) throw invalid(); hash.update(chunk);
  }
  if (count!==size) throw invalid();
  if (mimeType==='text/html') {
    if (size>2*1024*1024) throw invalid(); const source=utf8(await range(file,0,size));
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(source)||!/<(?:!doctype\s+html|html)(?:\s|>)/i.test(source)) throw invalid();
  } else if (mimeType==='model/gltf-binary') {
    if (size<20) throw invalid(); const header = await range(file,0,20);
    if (header.toString('ascii',0,4)!=='glTF' || header.readUInt32LE(4)!==2 || header.readUInt32LE(8)!==size ||
      header.readUInt32LE(16)!==0x4e4f534a) throw invalid();
    const jsonSize=header.readUInt32LE(12); if (jsonSize<4 || jsonSize>1024*1024 || jsonSize%4 || 20+jsonSize>size) throw invalid();
    try { const data=JSON.parse(utf8(await range(file,20,jsonSize))); if (data.asset?.version!=='2.0') throw invalid(); } catch { throw invalid(); }
    let offset=20+jsonSize;
    while(offset<size) { if(offset+8>size)throw invalid(); const chunk=await range(file,offset,8),length=chunk.readUInt32LE(0);
      if(length%4||chunk.readUInt32LE(4)!==0x004e4942||offset+8+length!==size)throw invalid(); offset+=8+length; }
  } else if (mimeType==='application/zip') {
    if(size<22)throw invalid(); const tail=await range(file,Math.max(0,size-65557),Math.min(size,65557));
    let end=-1; for(let i=tail.length-22;i>=0;i--)if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length){end=i;break;}
    if(end<0||tail.readUInt16LE(end+4)||tail.readUInt16LE(end+6))throw invalid();
    const entries=tail.readUInt16LE(end+10),directorySize=tail.readUInt32LE(end+12),directoryOffset=tail.readUInt32LE(end+16);
    if(!entries||entries>2000||entries!==tail.readUInt16LE(end+8)||directorySize>2*1024*1024||directoryOffset+directorySize!==size-tail.length+end)throw invalid();
    const directory=await range(file,directoryOffset,directorySize),names=new Set<string>(); let cursor=0,files=0;
    for(let i=0;i<entries;i++) {
      if(cursor+46>directory.length||directory.readUInt32LE(cursor)!==0x02014b50)throw invalid();
      const flags=directory.readUInt16LE(cursor+8),method=directory.readUInt16LE(cursor+10),compressed=directory.readUInt32LE(cursor+20),
        nameSize=directory.readUInt16LE(cursor+28),extra=directory.readUInt16LE(cursor+30),comment=directory.readUInt16LE(cursor+32),localOffset=directory.readUInt32LE(cursor+42);
      if(flags&1||![0,8].includes(method)||!nameSize||cursor+46+nameSize+extra+comment>directory.length||localOffset+30>directoryOffset)throw invalid();
      const name=utf8(directory.subarray(cursor+46,cursor+46+nameSize));
      if(name.startsWith('/')||/[\\:\x00-\x1f]/.test(name)||name.split('/').some(part=>part==='..'||part==='.')||names.has(name)||
        ((directory.readUInt32LE(cursor+38)>>>16)&0xf000)===0xa000)throw invalid();
      names.add(name);if(!name.endsWith('/'))files++;
      const local=await range(file,localOffset,30),localNameSize=local.readUInt16LE(26),localExtra=local.readUInt16LE(28);
      if(local.readUInt32LE(0)!==0x04034b50||local.readUInt16LE(8)!==method||local.readUInt16LE(6)!==flags||
        localOffset+30+localNameSize+localExtra+compressed>directoryOffset||utf8(await range(file,localOffset+30,localNameSize))!==name)throw invalid();
      cursor+=46+nameSize+extra+comment;
    }
    if(cursor!==directory.length||!files)throw invalid();
  } else throw invalid();
  return {byteSize:size,checksum:hash.digest('hex'),mimeType};
}
