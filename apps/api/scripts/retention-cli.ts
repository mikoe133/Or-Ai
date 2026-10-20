import { runRetentionPreviewCommand } from './retention-command';
import { ApiException } from '../src/common/http-errors';

runRetentionPreviewCommand(process.argv.slice(2)).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
  console.error(JSON.stringify({ error: { code: error instanceof ApiException ? error.code : 'SERVICE_UNAVAILABLE',
    message: error instanceof ApiException ? error.publicMessage : '本地清理预演失败，请检查目标和维护凭据' } }));
  process.exitCode = 1;
});
