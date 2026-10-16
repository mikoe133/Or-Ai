const assert=require('node:assert/strict');const{Readable}=require('node:stream');const{randomUUID,createHash}=require('node:crypto');
const{LocalAssetStorage}=require('/app/dist/operations/asset-storage.js');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const storage=new LocalAssetStorage({environment:'test',assets:{driver:'local',directory:'/app/.local/assets'}}),key=randomUUID()+'.blob';
(async()=>{assert.equal(process.arch,'x64');assert.equal(process.getuid(),1000);await storage.receive(key,Readable.from(bytes),{byteSize:bytes.length,mimeType:'image/png',checksum:createHash('sha256').update(bytes).digest('hex')});await storage.remove(key);console.log(JSON.stringify({linuxAmd64:true,nonRoot:true,localStorageWritable:true}));})().catch(error=>{console.log(JSON.stringify({localStorageWritable:false,errorCode:error.code||'unknown'}));process.exitCode=1;});
