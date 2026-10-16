import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { BrowserRequestGuard, type BrowserRequest } from '../redemption/browser-request.guard';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { OverviewService } from './overview.service';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}
  @Get('overview')
  read(@Req() r: AdminRequest, @Query() query: unknown) {
    return this.overview.overview(r.administrator, query);
  }
  @Get('audit')
  audit(@Req() r: AdminRequest, @Query() query: unknown) { return this.overview.audit(r.administrator, query); }
}

@Controller('events')
@UseGuards(BrowserRequestGuard)
export class EventsController {
  constructor(private readonly overview: OverviewService) {}
  @Post() @HttpCode(200)
  view(@Req() r: BrowserRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.overview.view(r.mutationAccess!, body);
  }
}
