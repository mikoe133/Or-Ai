import { runCatalogCommand } from './catalog-command';
import { ApiException } from '../src/common/http-errors';

runCatalogCommand(process.argv.slice(2)).then(result => {
  // Private configuration is intentionally visible only to the authenticated
  // local maintenance operator. No credential/code/session token is printed.
  console.log(JSON.stringify(result, null, 2));
  if ('valid' in result && result.valid === false) process.exitCode = 1;
}).catch(error => {
  console.error(JSON.stringify({ error: { code: error instanceof ApiException ? error.code : 'SERVICE_UNAVAILABLE',
    message: error instanceof ApiException ? error.publicMessage : '本地维护失败，请检查目标、凭据和 JSON 文件' } }));
  process.exitCode = 1;
});
