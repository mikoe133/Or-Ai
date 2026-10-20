import { Inject, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { ApiException } from '../common/http-errors';

@Injectable()
export class AccountCookiesService {
  constructor(@Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}
  private get secure() { return this.configuration.environment === 'production' || this.configuration.security.origins.some(value => value.startsWith('https://')); }
  get name() { return this.secure ? '__Host-orai_account' : 'orai_account'; }
  private options() { return { httpOnly: true, secure: this.secure, sameSite: 'strict' as const, path: '/' }; }
  read(request: Request) {
    const header = request.headers.cookie ?? '';
    if (header.length > 8192) throw new ApiException('FORBIDDEN', '浏览器凭据格式不正确', 403);
    const found = header.split(';').map(value => value.trim()).filter(value => value.startsWith(this.name + '='));
    if (found.length > 1) throw new ApiException('FORBIDDEN', '浏览器凭据格式不正确', 403);
    const value = found[0]?.slice(this.name.length + 1);
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
  }
  set(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.name, token, { ...this.options(), expires: expiresAt, maxAge: Math.max(1, expiresAt.getTime() - Date.now()) });
  }
  clear(response: Response) { response.clearCookie(this.name, this.options()); }
}
