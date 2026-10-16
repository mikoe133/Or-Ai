import { runAdminCommand } from './admin-command';
import { ApiException } from '../src/common/http-errors';

runAdminCommand(process.argv.slice(2)).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
  console.error(JSON.stringify({ error: { code: error instanceof ApiException ? error.code : 'SERVICE_UNAVAILABLE',
    message: error instanceof ApiException ? error.publicMessage : '管理员维护失败，请检查本地目标和数据库所有者凭据' } }));
  process.exitCode = 1;
});
