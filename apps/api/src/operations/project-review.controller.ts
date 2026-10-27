import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { ApiException } from '../common/http-errors';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { ProjectReviewService } from './project-review.service';
import { mediaResponse } from './media-admin.controller';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class ProjectReviewController {
  constructor(private readonly reviews:ProjectReviewService) {}
  @Get('products/:id/project-reviews') list(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown) {
    return this.reviews.list(r.administrator,id,q);
  }
  @Post('products/:id/project-reviews/preview') @HttpCode(200) preview(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.reviews.preview(r.administrator,id,b);
  }
  @Post('products/:id/project-reviews') @HttpCode(200) save(@Req() r:AdminRequest,@Param('id') id:string,@Body() b:unknown,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.reviews.save(r.administrator,id,b);
  }
  @Get('project-reviews/:id') read(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);return this.reviews.read(r.administrator,id);
  }
  @Post('project-reviews/:id/:action') @HttpCode(200) transition(@Req() r:AdminRequest,@Param('id') id:string,@Param('action') action:string,@Body() b:unknown,@Query() q:unknown) {
    parseInput(CatalogMetadataQuerySchema,q);if(!['submit','return','retain'].includes(action))throw new ApiException('NOT_FOUND','审核操作不存在',404);
    return this.reviews.transition(r.administrator,id,action as 'submit'|'return'|'retain',b);
  }
  @Get('project-reviews/:id/files/:kind/:fileId/content') async file(@Req() r:AdminRequest,@Param('id') id:string,@Param('kind') kind:string,
    @Param('fileId') fileId:string,@Query() q:unknown,@Res({passthrough:true}) response:Response) {
    parseInput(CatalogMetadataQuerySchema,q);if(!['original','media','method'].includes(kind))throw new ApiException('NOT_FOUND','留存文件类型不存在',404);
    const file=await this.reviews.file(r.administrator,id,kind as 'original'|'media'|'method',fileId,r.headers.range),stream=mediaResponse(file,response);
    response.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(file.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16)));
    response.setHeader('Content-Security-Policy',"sandbox; default-src 'none'");return stream;
  }
}
