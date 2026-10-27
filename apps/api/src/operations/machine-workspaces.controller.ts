import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { MachineProjectsService } from './machine-projects.service';

@Controller('admin/machine-workspaces')
@UseGuards(AdminRequestGuard)
export class MachineWorkspacesController {
  constructor(private readonly projects: MachineProjectsService) {}
  @Get() list(@Req() r: AdminRequest, @Query() q: unknown) { return this.projects.workspaces(r.administrator, q); }
  @Post() @HttpCode(200) create(@Req() r: AdminRequest, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.projects.createWorkspace(r.administrator, b);
  }
  @Post(':id/revoke') @HttpCode(200) revoke(@Req() r: AdminRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q); return this.projects.revokeWorkspace(r.administrator, id, b);
  }
}
