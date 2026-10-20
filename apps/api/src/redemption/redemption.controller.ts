import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { AnonymousSessionContextSchema } from '@orai/contracts/private';
import { parseInput } from '../common/parse-input';
import { ApiException } from '../common/http-errors';
import { BrowserRequestGuard, type BrowserRequest } from './browser-request.guard';
import { BrowserSecurityService } from './browser-security.service';
import { RedemptionService } from './redemption.service';
import { SessionsService } from './sessions.service';
import { EntitlementAccessService } from './entitlement-access.service';

@Controller('redemptions')
@UseGuards(BrowserRequestGuard)
export class RedemptionController {
  constructor(private readonly redemptions: RedemptionService, private readonly browser: BrowserSecurityService) {}
  private async redeem(request: BrowserRequest, input: unknown, query: unknown, response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const result = await this.redemptions.resolve(request.mutationAccess!, input);
    if (result.newSession) this.browser.setSessionCookie(response, result.newSession.token, result.newSession.expiresAt);
    return result.response;
  }
  @Post('claim') @HttpCode(200)
  claim(@Req() request: BrowserRequest, @Body() input: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) { return this.redeem(request, input, query, response); }
  @Post('recover') @HttpCode(200)
  recover(@Req() request: BrowserRequest, @Body() input: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) { return this.redeem(request, input, query, response); }
}

@Controller('session')
@UseGuards(BrowserRequestGuard)
export class AnonymousSessionController {
  constructor(private readonly sessions: SessionsService, private readonly browser: BrowserSecurityService, private readonly entitlements: EntitlementAccessService) {}
  @Get('context')
  async context(@Req() request: BrowserRequest, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const access = await this.sessions.fromRequest(request);
    const session = access ? await this.sessions.fresh(access).catch((error: unknown) => {
      if (error instanceof ApiException && error.code === 'AUTH_REQUIRED') return undefined;
      throw error;
    }) : undefined;
    if (!session && this.browser.readCookie(request, this.browser.sessionCookieName)) this.browser.clearSessionCookie(response);
    return AnonymousSessionContextSchema.parse({ authenticated: Boolean(session), csrfToken: this.browser.csrfContext(request, response), sessionExpiresAt: session?.expiresAt.toISOString() ?? null });
  }
  @Get('entitlements')
  async list(@Req() request: BrowserRequest, @Query() query: unknown) { return this.entitlements.list(await this.sessions.requireRequest(request), query); }
  @Get('entitlements/:id')
  async item(@Req() request: BrowserRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.entitlements.readMetadata(await this.sessions.requireRequest(request), id);
  }
  @Post('logout') @HttpCode(204)
  async logout(@Req() request: BrowserRequest, @Body() input: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query); parseInput(CatalogMetadataQuerySchema, input);
    const access = await this.sessions.fromRequest(request);
    if (access) await this.sessions.revoke(access);
    this.browser.clearSessionCookie(response, true);
  }
}
