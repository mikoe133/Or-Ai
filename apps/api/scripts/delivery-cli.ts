import { runDeliveryCommand } from './delivery-command';
import { ApiException } from '../src/common/http-errors';
runDeliveryCommand(process.argv.slice(2)).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
  console.error(JSON.stringify({ error: { code: error instanceof ApiException ? error.code : 'SERVICE_UNAVAILABLE',
    message: error instanceof ApiException ? error.publicMessage : '本地交付维护失败，请检查目标、凭据和文件' } }));
  process.exitCode = 1;
});
