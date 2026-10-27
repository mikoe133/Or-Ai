import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { ExperienceAuthoringService } from './experience-authoring.service';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class ExperienceAuthoringController {
  constructor(private readonly experiences: ExperienceAuthoringService) {}
  @Get('products/:product/versions/:version/experience')
  workspace(@Req() r: AdminRequest, @Param('product') p: string, @Param('version') v: string, @Query() q: unknown) {
    return this.experiences.workspace(r.administrator,p,v,q);
  }
  @Get('products/:product/versions/:version/experience/history')
  history(@Req() r: AdminRequest, @Param('product') p: string, @Param('version') v: string, @Query() q: unknown) {
    return this.experiences.history(r.administrator,p,v,q);
  }
  @Post('products/:product/versions/:version/experience') @HttpCode(200)
  save(@Req() r: AdminRequest, @Param('product') p: string, @Param('version') v: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema,q); return this.experiences.save(r.administrator,p,v,b);
  }
  @Post('products/:product/versions/:version/experience/validate') @HttpCode(200)
  validate(@Req() r: AdminRequest, @Param('product') p: string, @Param('version') v: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema,q); return this.experiences.check(r.administrator,p,v,b);
  }
  @Get('experience-revisions/:id')
  read(@Req() r: AdminRequest, @Param('id') id: string, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema,q); return this.experiences.read(r.administrator,id);
  }
  @Post('experience-revisions/:id/review') @HttpCode(200)
  review(@Req() r: AdminRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema,q); return this.experiences.review(r.administrator,id,b);
  }
  @Post('experience-revisions/:id/preview') @HttpCode(200)
  preview(@Req() r: AdminRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema,q); return this.experiences.preview(r.administrator,id,b);
  }
}
