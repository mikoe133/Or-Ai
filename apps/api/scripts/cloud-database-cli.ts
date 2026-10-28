import {runCloudDatabaseCommand} from './cloud-database';
const arguments_=process.argv.slice(2);
// pnpm's standalone executable also understands Node's --env-file; retain the
// standard package-script delimiter until this explicit maintenance boundary.
void runCloudDatabaseCommand(arguments_[0]==='--'?arguments_.slice(1):arguments_).then(result=>{console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;})
  .catch(()=>{console.error(JSON.stringify({ok:false,error:'CLOUD_MAINTENANCE_FAILED'}));process.exitCode=1;});
