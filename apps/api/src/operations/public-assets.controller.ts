import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { BrowserRequestGuard, type BrowserRequest } from '../redemption/browser-request.guard';
import { FilesService } from './files.service';
import { mediaResponse } from './media-admin.controller';

@Controller('assets')
@UseGuards(BrowserRequestGuard)
export class PublicAssetsController {
  constructor(private readonly files: FilesService) {}
  @Get(':id/files/:fileId/content')
  async cover(@Req() request: BrowserRequest, @Param('id') id: unknown, @Param('fileId') fileId: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    parseInput(CatalogMetadataQuerySchema, query);
    return mediaResponse(await this.files.publicCover(id, fileId, request.headers.range), response);
  }
}
