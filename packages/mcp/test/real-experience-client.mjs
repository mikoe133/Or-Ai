import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { businessToolNames } from '../dist/content-tools.js';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

let client, phase='connect';
const check=value=>{if(!value)throw new Error('check failed');};
try {
  const scenario=JSON.parse(process.env.ORAI_MCP_EXPERIENCE_SCENARIO_JSON);
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../dist/cli.js',import.meta.url))],stderr:'pipe',
    env:Object.fromEntries(['ORAI_MCP_API_URL','ORAI_MCP_TOKEN','ORAI_MCP_DOMAIN','ORAI_MCP_ALLOWED_ROOT'].map(k=>[k,process.env[k]]))});
  transport.stderr.on('data',()=>{});
  client=new Client({name:'orai-experience-check',version:'0.1.0'});await client.connect(transport);
  const call=async(name,args={})=>{phase=name;const r=await client.callTool({name,arguments:args});
    check(!r.isError&&r.structuredContent?.ok===true);check(!JSON.stringify(r).includes(process.env.ORAI_MCP_TOKEN));return r.structuredContent.data;};
  const tools=await client.listTools();check(tools.tools.length===5+businessToolNames('experience').length);
  check(!tools.tools.some(t=>/publish|review|refund|consumer/.test(t.name)));
  const contextInput={productVersionId:scenario.productVersionId,skillVersionIds:[scenario.skillVersionId],...(scenario.renderer?{includeTemplates:true}:{})};
  const legacy=await call('context_bundle_get',contextInput);check(!('capabilities' in legacy));
  const context=await call('context_bundle_get',{...contextInput,includeCapabilities:true,capabilityVersion:2});
  check(context.capabilities.schemaVersion===2&&context.capabilities.status==='compatible'&&context.capabilities.modules.experience==='editable');
  check(context.capabilities.registered.some(item=>item.renderer==='quiet-room@1'&&item.report==='field-notes@1'&&item.limits.maxOptions===4));
  check(context.capabilities.registered.some(item=>item.renderer==='reflection-garden@1'&&item.report==='garden-notes@1'&&item.graphics.backend==='webgl2'));
  for(const field of ['points','weight','bands','answers','snapshot','storageKey'])check(!JSON.stringify(context.capabilities).includes('"'+field+'"'));
  const mimeType=scenario.mimeType??'image/jpeg';
  const bytes=await readFile(scenario.filePath),checksum=createHash('sha256').update(bytes).digest('hex');
  const prepared=await call('upload_prepare',{requestId:randomUUID(),target:{type:'experience_resource',productVersionId:scenario.productVersionId,purpose:'illustration'},
    fileName:basename(scenario.filePath),mimeType,byteSize:bytes.length,checksum});
  await call('upload_file',{uploadId:prepared.uploadId,ticket:prepared.ticket,filePath:scenario.filePath});
  const file=await call('upload_complete',{uploadId:prepared.uploadId,ticket:prepared.ticket,requestId:randomUUID()});
  check(file.status==='available');
  const manifest=context.defaultManifest;
  if(scenario.renderer){const template=context.supported.templates.find(template=>template.renderer===scenario.renderer);check(!!template);
    const [key,version]=template.renderer.split('@'),[reportKey,reportVersion]=template.report.split('@');
    manifest.renderer={key,version:Number(version)};manifest.report.renderer={key:reportKey,version:Number(reportVersion)};}
  manifest.resources=[{resourceId:'sdk-picture',fileId:file.fileId,purpose:'illustration',label:scenario.label??'SDK 场景插画',mimeType,byteSize:bytes.length,checksum}];
  const input={manifest,reportPlan:context.reportPlan,methods:context.methods.map(m=>({purpose:m.purpose,skillVersionId:m.version.id})),note:'真实 SDK 体验制作',
    expectedRevision:scenario.expectedRevision,expectedVersionRevision:scenario.expectedVersionRevision,requestId:randomUUID()};
  const {expectedRevision:_r,expectedVersionRevision:_v,requestId:_i,...proposal}=input;
  check((await call('experience_validate',proposal)).valid===true);
  const saved=await call('experience_draft_save',input),retry=await call('experience_draft_save',input);check(saved.id===retry.id&&saved.digest===retry.digest);
  const fixed=await call('experience_get',{revisionId:saved.id});check(fixed.source==='mcp'&&fixed.machineRequestId===input.requestId&&fixed.manifest.resources[0].checksum===checksum);
  check((await call('references_validate',{revisionId:saved.id})).valid===true);
  const list=await call('experience_list',{productVersionId:scenario.productVersionId});check(list.items.some(r=>r.id===saved.id)&&list.items.every(r=>!('manifest'in r)));
  await client.close();client=undefined;
  process.stdout.write(JSON.stringify({ok:true,tools:tools.tools.length,revisionId:saved.id})+'\n');
} catch {
  await client?.close().catch(()=>{});process.stderr.write('MCP_EXPERIENCE_CHECK_FAILED:'+phase+'\n');process.exitCode=1;
}
