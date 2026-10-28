import {runCloudDatabaseCommand} from './cloud-database';
void runCloudDatabaseCommand(process.argv.slice(2)).then(result=>{console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;})
  .catch(()=>{console.error(JSON.stringify({ok:false,error:'CLOUD_MAINTENANCE_FAILED'}));process.exitCode=1;});
