import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Req, Res, SetMetadata, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard, BINARY_UPLOAD, type AdminRequest } from './admin-request.guard';
import { AssetsService } from './assets.service';
import { FilesService } from './files.service';

export function mediaResponse(file: Awaited<ReturnType<FilesService['content']>>, response: Response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Content-Disposition', "inline; filename*=UTF-8''" + encodeURIComponent(file.name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16)));
  if (file.range) { response.status(206); response.setHeader('Content-Range', file.range); }
  return new StreamableFile(file.stream, { type: file.mimeType, length: file.length });
}

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class MediaAdminController {
  constructor(private readonly assets: AssetsService, private readonly files: FilesService) {}
  @Get('assets')
  list(@Req() r: AdminRequest, @Query() query: unknown) { return this.assets.list(r.administrator, query); }
  @Post('assets') @HttpCode(200)
  create(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.assets.create(r.administrator, body);
  }
  @Get('assets/:id')
  read(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.assets.read(r.administrator, id);
  }
  @Patch('assets/:id')
  update(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.assets.update(r.administrator, id, body);
  }
  @Post('assets/:id/review') @HttpCode(200)
  review(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.assets.transition(r.administrator, id, 'review', body);
  }
  @Post('assets/:id/ready') @HttpCode(200)
  ready(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.assets.transition(r.administrator, id, 'ready', body);
  }
  @Post('assets/:id/archive') @HttpCode(200)
  archive(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.assets.transition(r.administrator, id, 'archive', body);
  }
  @Post('uploads') @HttpCode(200)
  prepare(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.files.prepare(r.administrator, body);
  }
  @Get('uploads/:id')
  status(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.files.status(r.administrator, id);
  }
  @Put('uploads/:id/content') @SetMetadata(BINARY_UPLOAD, true)
  upload(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.files.upload(r.administrator, id, r);
  }
  @Post('uploads/:id/complete') @HttpCode(200)
  complete(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.files.complete(r.administrator, id, body);
  }
  @Get('files/:id/content')
  async content(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query); return mediaResponse(await this.files.content(r.administrator, id, r.headers.range), response);
  }
}
