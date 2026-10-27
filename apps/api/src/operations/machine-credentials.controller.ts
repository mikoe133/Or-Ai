import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { MachineCredentialsService } from './machine-credentials.service';

@Controller('admin/machine-credentials')
@UseGuards(AdminRequestGuard)
export class MachineCredentialsController {
  constructor(private readonly credentials: MachineCredentialsService) {}
  @Get() list(@Req() r: AdminRequest, @Query() q: unknown) { return this.credentials.list(r.administrator, q); }
  @Post() @HttpCode(200) create(@Req() r: AdminRequest, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.credentials.create(r.administrator, b);
  }
  @Post(':id/revoke') @HttpCode(200) revoke(@Req() r: AdminRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.credentials.revoke(r.administrator, id, b);
  }
  @Get(':id/calls') calls(@Req() r: AdminRequest, @Param('id') id: string, @Query() q: unknown) {
    return this.credentials.calls(r.administrator, id, q);
  }
}
