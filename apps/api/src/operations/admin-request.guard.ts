import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountSessionsService } from '../accounts/account-sessions.service';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { BrowserSecurityService } from '../redemption/browser-security.service';
import { RequestRateService } from '../redemption/request-rate.service';
import type { BrowserRequest } from '../redemption/browser-request.guard';

export type AdminRequest = BrowserRequest & { administrator: CatalogAdminAccess };
export const BINARY_UPLOAD = 'orai.binary-upload';

@Injectable()
export class AdminRequestGuard implements CanActivate {
  constructor(private readonly sessions: AccountSessionsService, private readonly administrators: CatalogAdminAccessService,
    private readonly browser: BrowserSecurityService, private readonly rates: RequestRateService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    context.switchToHttp().getResponse().setHeader('Cache-Control', 'private, no-store');
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const format = this.reflector.get<boolean>(BINARY_UPLOAD, context.getHandler()) ? 'binary' : 'json';
    this.browser.checkOrigin(request, mutation, format);
    await this.rates.forRequest(request, mutation);
    if (mutation) request.mutationAccess = this.browser.authorizeMutation(request, format);
    request.administrator = await this.administrators.authorizeAccount(await this.sessions.requireRequest(request));
    return true;
  }
}
