import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, Res, SetMetadata, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard, BINARY_UPLOAD, type AdminRequest } from './admin-request.guard';
import { ProjectOriginalFilesService } from './project-original-files.service';
import { mediaResponse } from './media-admin.controller';

@Controller('admin/project-originals')
@UseGuards(AdminRequestGuard)
export class ProjectOriginalFilesController {
  constructor(private readonly originals:ProjectOriginalFilesService) {}
  @Post() @HttpCode(200) prepare(@Req() r:AdminRequest,@Body() b:unknown,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.originals.prepare(r.administrator,b);
  }
  @Get(':id') status(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.originals.status(r.administrator,id);
  }
  @Put(':id/content') @SetMetadata(BINARY_UPLOAD,true) upload(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.originals.upload(r.administrator,id,r);
  }
  @Post(':id/complete') @HttpCode(200) complete(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.originals.complete(r.administrator,id,b);
  }
  @Get(':id/content') async content(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown,@Res({passthrough:true}) response:Response) {
    parseInput(CatalogMetadataQuerySchema,q);const file=await this.originals.content(r.administrator,id,r.headers.range),stream=mediaResponse(file,response);
    response.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(file.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16)));
    response.setHeader('Content-Security-Policy',"sandbox; default-src 'none'");return stream;
  }
}
