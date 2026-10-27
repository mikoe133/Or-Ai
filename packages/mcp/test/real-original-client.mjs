import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { randomUUID,createHash } from 'node:crypto';
let client;
try{
  const scenario=JSON.parse(process.env.ORAI_MCP_ORIGINAL_SCENARIO_JSON),bytes=await readFile(scenario.filePath),checksum=createHash('sha256').update(bytes).digest('hex');
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../dist/cli.js',import.meta.url))],stderr:'pipe',
    env:Object.fromEntries(['ORAI_MCP_API_URL','ORAI_MCP_TOKEN','ORAI_MCP_DOMAIN','ORAI_MCP_ALLOWED_ROOT'].map(k=>[k,process.env[k]]))});
  transport.stderr.on('data',()=>{});client=new Client({name:'orai-original-isolated-check',version:'0.1.0'});await client.connect(transport);
  const call=async(name,input)=>{const result=await client.callTool({name,arguments:input});
    if(result.isError||!result.structuredContent?.ok||JSON.stringify(result).includes(process.env.ORAI_MCP_TOKEN))throw new Error();return result.structuredContent.data;};
  const prepared=await call('upload_prepare',{requestId:randomUUID(),target:scenario.target,fileName:basename(scenario.filePath),mimeType:scenario.mimeType,
    byteSize:bytes.length,checksum});
  await call('upload_file',{uploadId:prepared.uploadId,ticket:prepared.ticket,filePath:scenario.filePath});
  const input={uploadId:prepared.uploadId,ticket:prepared.ticket,requestId:randomUUID()},file=await call('upload_complete',input),again=await call('upload_complete',input);
  if(file.status!=='available'||file.checksum!==checksum||again.fileId!==file.fileId)throw new Error();
  process.stdout.write(JSON.stringify({ok:true,fileId:file.fileId,checksum})+'\n');
}catch{process.stderr.write('Isolated original SDK verification failed.\n');process.exitCode=1;}
finally{await client?.close();}
