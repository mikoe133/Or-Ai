import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { CodexConnectionsService } from './codex-connections.service';

@Controller('admin/codex-connections')
@UseGuards(AdminRequestGuard)
export class CodexConnectionsController {
  constructor(private readonly connections: CodexConnectionsService) {}
  @Get() list(@Req() r: AdminRequest, @Query() q: unknown) { return this.connections.list(r.administrator, q); }
  @Get(':id') read(@Req() r: AdminRequest, @Param('id') id: string, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.connections.read(r.administrator, id);
  }
  @Post('preview') @HttpCode(200) preview(@Req() r: AdminRequest, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.connections.preview(r.administrator, b);
  }
  @Post() @HttpCode(200) create(@Req() r: AdminRequest, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.connections.create(r.administrator, b);
  }
  @Post(':id/revoke') @HttpCode(200) revoke(@Req() r: AdminRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.connections.revoke(r.administrator, id, b);
  }
}
