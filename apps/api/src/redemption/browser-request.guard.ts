import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { ContextRequest } from '../common/request-context';
import { BrowserSecurityService, type BrowserMutationAccess } from './browser-security.service';
import { RequestRateService } from './request-rate.service';
export type BrowserRequest = ContextRequest & { mutationAccess?: BrowserMutationAccess };
@Injectable()
export class BrowserRequestGuard implements CanActivate {
  constructor(private readonly browser: BrowserSecurityService, private readonly rates: RequestRateService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<BrowserRequest>();
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    this.browser.checkOrigin(request, mutation);
    await this.rates.forRequest(request, mutation);
    if (mutation) request.mutationAccess = this.browser.authorizeMutation(request);
    return true;
  }
}
