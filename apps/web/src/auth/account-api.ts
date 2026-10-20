import { ApiErrorSchema } from '@orai/contracts';
import { AccountContextSchema, AccountLogoutResponseSchema, AccountSessionResponseSchema } from '@orai/contracts/private';
import { AuthFlowError } from './errors.js';

type Fetcher = typeof fetch;
export class AccountApi {
  constructor(private readonly fetcher: Fetcher = (input, init) => fetch(input, init)) {}
  private async request(path: string, body?: unknown, csrf?: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        signal: AbortSignal.timeout(15000), ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' }, body: JSON.stringify(body) }) });
    } catch { throw new AuthFlowError('SERVICE_UNAVAILABLE', '连接失败，请检查网络后重试。'); }
    let data: unknown;
    try { data = await response.json(); } catch { throw new AuthFlowError('SERVICE_UNAVAILABLE', '账户服务响应异常，请稍后重试。'); }
    if (!response.ok) {
      const error = ApiErrorSchema.safeParse(data);
      if (!error.success) throw new AuthFlowError('SERVICE_UNAVAILABLE', '账户服务暂时不可用，请稍后重试。');
      const code = error.data.error.code, retry = Number(response.headers.get('retry-after'));
      throw new AuthFlowError(code, error.data.error.message, Number.isFinite(retry) && retry > 0 ? Math.min(Math.ceil(retry), 86400) : 0);
    }
    return data;
  }
  async context() {
    const result = AccountContextSchema.safeParse(await this.request('/api/account/context'));
    if (!result.success) throw new AuthFlowError('SERVICE_UNAVAILABLE', '账户状态暂时不可用，请重试。');
    return result.data;
  }
  private async mutation(path: string, body: unknown) {
    const context = await this.context();
    try { return await this.request(path, body, context.csrfToken); }
    catch (error) {
      if (!(error instanceof AuthFlowError) || error.code !== 'CSRF_INVALID') throw error;
      return this.request(path, body, (await this.context()).csrfToken);
    }
  }
  async handoff(accessToken: string, refreshToken: string) {
    const result = AccountSessionResponseSchema.safeParse(await this.mutation('/api/account/session', { accessToken, refreshToken }));
    if (!result.success) throw new AuthFlowError('SERVICE_UNAVAILABLE', '登录确认失败，请重新登录。');
    return result.data;
  }
  async logout() {
    const result = AccountLogoutResponseSchema.safeParse(await this.mutation('/api/account/logout', {}));
    if (!result.success) throw new AuthFlowError('SERVICE_UNAVAILABLE', '退出确认失败，请重试。');
    return result.data;
  }
}
