import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { AccountContextSchema, AccountLogoutResponseSchema, AccountSessionResponseSchema } from '@orai/contracts/private';
import { parseInput } from '../common/parse-input';
import { BrowserRequestGuard, type BrowserRequest } from '../redemption/browser-request.guard';
import { BrowserSecurityService } from '../redemption/browser-security.service';
import { AccountCookiesService } from './account-cookies.service';
import { AccountSessionsService } from './account-sessions.service';
import { AccountEntitlementsService } from './account-entitlements.service';
import { AccountBindingService } from './account-binding.service';

@Controller()
@UseGuards(BrowserRequestGuard)
export class AccountsController {
  constructor(private readonly sessions: AccountSessionsService, private readonly cookies: AccountCookiesService,
    private readonly browser: BrowserSecurityService, private readonly entitlements: AccountEntitlementsService,
    private readonly bindings: AccountBindingService) {}
  @Get('me') @Header('Cache-Control', 'private, no-store')
  async me(@Req() request: BrowserRequest, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.sessions.account(await this.sessions.requireRequest(request));
  }
  @Get('me/entitlements') @Header('Cache-Control', 'private, no-store')
  async list(@Req() request: BrowserRequest, @Query() query: unknown) {
    return this.entitlements.list(await this.sessions.requireRequest(request), query);
  }
  @Get('me/entitlements/:id') @Header('Cache-Control', 'private, no-store')
  async entitlement(@Req() request: BrowserRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.entitlements.readMetadata(await this.sessions.requireRequest(request), id);
  }
  @Get('me/reports') @Header('Cache-Control', 'private, no-store')
  async reports(@Req() request: BrowserRequest, @Query() query: unknown) {
    return this.entitlements.reports(await this.sessions.requireRequest(request), query);
  }
  @Post('me/entitlements/bind') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  async bind(@Req() request: BrowserRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.bindings.resolve(await this.sessions.requireRequest(request), request.mutationAccess!, body, 'bind');
  }
  @Post('me/redemptions/claim') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  async redeem(@Req() request: BrowserRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.bindings.resolve(await this.sessions.requireRequest(request), request.mutationAccess!, body, 'redeem');
  }
  @Get('account/context') @Header('Cache-Control', 'private, no-store')
  async context(@Req() request: BrowserRequest, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const access = await this.sessions.fromRequest(request);
    if (!access) this.cookies.clear(response);
    return AccountContextSchema.parse({ configured: this.sessions.configured, account: access ? await this.sessions.account(access) : null,
      csrfToken: this.browser.csrfContext(request, response), sessionExpiresAt: access ? (await this.sessions.expiresAt(access)).toISOString() : null });
  }
  @Post('account/session') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  async handoff(@Req() request: BrowserRequest, @Body() body: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const previous = this.cookies.read(request), result = await this.sessions.handoff(body);
    if (previous) await this.sessions.logout(previous);
    this.cookies.set(response, result.token, result.expiresAt);
    return AccountSessionResponseSchema.parse({ account: result.account, sessionExpiresAt: result.expiresAt.toISOString() });
  }
  @Post('account/logout') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  async logout(@Req() request: BrowserRequest, @Body() body: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);parseInput(CatalogMetadataQuerySchema, body);
    const result = await this.sessions.logout(this.cookies.read(request));
    this.cookies.clear(response);return AccountLogoutResponseSchema.parse(result);
  }
}
