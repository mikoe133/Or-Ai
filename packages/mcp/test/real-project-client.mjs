// Invoked only with an isolated API fixture; stdout contains bounded check results.
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
let client;
try {
  const scenario = JSON.parse(process.env.ORAI_MCP_PROJECT_SCENARIO_JSON);
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../dist/cli.js', import.meta.url))], stderr: 'pipe',
    env: Object.fromEntries(['ORAI_MCP_API_URL','ORAI_MCP_TOKEN','ORAI_MCP_DOMAIN','ORAI_MCP_ALLOWED_ROOT'].map(k=>[k,process.env[k]])) });
  transport.stderr.on('data',()=>{});
  client = new Client({ name:'orai-isolated-project-check', version:'0.1.0' }); await client.connect(transport);
  const tools = await client.listTools(), domain = process.env.ORAI_MCP_DOMAIN;
  if (!tools.tools.some(t=>t.name==='project_context_get') || tools.tools.some(t=>/publish|activate|refund/.test(t.name))) throw new Error();
  if (tools.tools.some(t=>t.name==='project_bootstrap') !== (domain==='assessment')) throw new Error();
  const results = [];
  for (const item of scenario.calls) {
    const result = await client.callTool({name:item.name,arguments:item.input});
    if (JSON.stringify(result).includes(process.env.ORAI_MCP_TOKEN) || result.isError || !result.structuredContent?.ok) throw new Error();
    results.push({ name:item.name, data:result.structuredContent.data });
  }
  process.stdout.write(JSON.stringify({ ok:true, domain, tools:tools.tools.length, results })+'\n');
} catch { process.stderr.write('Isolated project SDK verification failed.\n'); process.exitCode=1; }
finally { await client?.close(); }
