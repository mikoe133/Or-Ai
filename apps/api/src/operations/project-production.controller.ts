import { Controller, Get, Post, Body, Param, Query, Req, Res, HttpCode, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { ProjectProductionService } from './project-production.service';
import { ProjectMethodOperationsService } from './project-method-operations.service';
import { parseInput } from '../common/parse-input';
import { mediaResponse } from './media-admin.controller';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class ProjectProductionController {
  constructor(private readonly production: ProjectProductionService, private readonly methodsOps: ProjectMethodOperationsService) {}
  @Get('production-modules/:id/method-candidates')
  candidates(@Req() r: AdminRequest, @Param('id') id: string, @Query() q: unknown) {
    return this.methodsOps.candidates(r.administrator,id,q);
  }
  @Get('production-modules/:id/handoff-inputs')
  inputs(@Req() r: AdminRequest, @Param('id') id: string, @Query() q: unknown) {
    return this.methodsOps.inputOptions(r.administrator,id,q);
  }
  @Post('production-modules/:id/handoff/preview') @HttpCode(200)
  previewHandoff(@Req() r: AdminRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.methodsOps.preview(r.administrator,id,b);
  }
  @Post('production-modules/:id/handoff/export') @HttpCode(200)
  exportHandoff(@Req() r: AdminRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.methodsOps.export(r.administrator,id,b);
  }
  @Get('production-modules/:id/methods')
  methods(@Req() r: AdminRequest, @Param('id') id: string, @Query() query: unknown) {
    return this.production.listMethods(r.administrator, id, query);
  }
  @Post('production-modules/:id/methods') @HttpCode(200)
  capture(@Req() r: AdminRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.methodsOps.capture(r.administrator, id, body);
  }
  @Get('project-methods/:id')
  method(@Req() r: AdminRequest, @Param('id') id: string, @Query() query: unknown) {
    return this.production.readMethod(r.administrator, id, query);
  }
  @Get('project-methods/:id/files/:fileId/content')
  async reference(@Req() r: AdminRequest, @Param('id') id: string, @Param('fileId') fileId: string, @Query() query: unknown,
    @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const file = await this.production.methodFile(r.administrator, id, fileId, r.headers.range);
    const stream = mediaResponse(file, response);
    response.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" +
      encodeURIComponent(file.name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16)));
    return stream;
  }
  @Get('production-modules/:id/productions')
  list(@Req() r: AdminRequest, @Param('id') id: string, @Query() query: unknown) {
    return this.production.list(r.administrator, id, query);
  }
  @Post('production-modules/:id/productions') @HttpCode(200)
  save(@Req() r: AdminRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.production.save(r.administrator, id, body);
  }
  @Get('project-productions/:id')
  read(@Req() r: AdminRequest, @Param('id') id: string, @Query() query: unknown) {
    return this.production.read(r.administrator, id, query);
  }
  @Get('project-productions/:id/outputs/:outputId/content')
  async output(@Req() r: AdminRequest, @Param('id') id: string, @Param('outputId') outputId: string, @Query() query: unknown,
    @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const file = await this.production.outputFile(r.administrator, id, outputId, r.headers.range);
    const stream = mediaResponse(file, response);
    if (!/^(image|video)\//.test(file.mimeType)) {
      response.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(file.name).replace(/['()*]/g,c=>'%' + c.charCodeAt(0).toString(16)));
      response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    }
    return stream;
  }
}
