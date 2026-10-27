// An isolated test client. Only business identities and bounded observations leave the process.
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
let client;
try {
  const scenario=JSON.parse(process.env.ORAI_MCP_RUN_SCENARIO_JSON);
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../dist/cli.js',import.meta.url))],stderr:'pipe',
    env:Object.fromEntries(['ORAI_MCP_API_URL','ORAI_MCP_TOKEN','ORAI_MCP_DOMAIN','ORAI_MCP_ALLOWED_ROOT'].map(k=>[k,process.env[k]]))});
  transport.stderr.on('data',()=>{});
  client=new Client({name:'orai-isolated-run-recovery',version:'0.1.0'});await client.connect(transport);
  const call=async(name,input)=>{
    const result=await client.callTool({name,arguments:input});
    if(result.isError||!result.structuredContent?.ok||JSON.stringify(result).includes(process.env.ORAI_MCP_TOKEN))throw new Error('tool failed');
    return result.structuredContent.data;
  };
  const run=await call('production_run_get',{runId:scenario.runId});
  const module=run.modules.find(m=>m.planModuleId===scenario.planModuleId);
  let claimInput;
  if(scenario.phase==='start')claimInput={...scenario.claim,requestId:randomUUID()};
  else {
    if(!module.latestAttemptId)throw new Error('receipt missing');
    const prior=await call('module_attempt_get',{attemptId:module.latestAttemptId});
    if(prior.job?.jobId!==scenario.jobId||prior.job.terminal)throw new Error('original job not restored');
    claimInput={runId:run.id,planModuleId:prior.planModuleId,clientKey:prior.clientKey,methods:prior.methods,inputs:prior.inputs,leaseSeconds:300,requestId:randomUUID()};
  }
  const claimed=await call('module_attempt_claim',claimInput);
  if(!claimed.leaseToken||claimed.nextAction!==(scenario.phase==='start'?'produce':'inspect_existing_job'))throw new Error('unsafe recovery action');
  const observed=await call('module_attempt_event',{attemptId:claimed.attempt.id,leaseToken:claimed.leaseToken,expectedRevision:claimed.attempt.revision,requestId:randomUUID(),
    state:scenario.phase==='start'?'producing':'uploading',step:'S3',reasonCode:null,reason:scenario.phase==='start'?'合成作业已登记。':'新进程从回执恢复原作业，未再次创建作业。',
    job:{provider:'isolated-test-provider',jobId:scenario.jobId,terminal:false},reportedCostFen:null,reportedTokens:null});
  process.stdout.write(JSON.stringify({ok:true,pid:process.pid,phase:scenario.phase,runId:run.id,attemptId:observed.id,jobId:observed.job.jobId,
    revision:observed.revision,state:observed.state,nextAction:claimed.nextAction,platformExecuted:observed.platformExecuted})+'\n');
} catch {process.stderr.write('Isolated run recovery verification failed.\n');process.exitCode=1;}
finally {await client?.close();}
