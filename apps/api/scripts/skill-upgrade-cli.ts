import { runSkillUpgradeCommand } from './skill-upgrade-command';
import { ApiException } from '../src/common/http-errors';

runSkillUpgradeCommand(process.argv.slice(2)).then(({ result, outputWritten }) => {
  const failures = 'items' in result ? result.items.filter(item => 'state' in item && item.state === 'failed').length : 0;
  console.log(JSON.stringify(outputWritten ? { written: true, failures } : result, null, 2));
  if (failures) process.exitCode = 1;
}).catch(error => {
  console.error(JSON.stringify({ error: { code: error instanceof ApiException ? error.code : 'SERVICE_UNAVAILABLE',
    message: error instanceof ApiException ? error.publicMessage : '本地方法维护失败，请检查参数、目标和管理员授权' } }));
  process.exitCode = 1;
});
