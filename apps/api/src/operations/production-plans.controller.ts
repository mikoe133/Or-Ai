import { Controller, Get, Post, Body, Param, Query, Req, HttpCode, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { ProductionPlansService } from './production-plans.service';
import { parseInput } from '../common/parse-input';
import { ProjectCanvasService } from './project-canvas.service';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class ProductionPlansController {
  constructor(private readonly plans: ProductionPlansService,private readonly canvas:ProjectCanvasService) {}
  @Get('production-plans/:id/canvas-layout')
  canvasState(@Req() r:AdminRequest,@Param('id') id:string,@Query() query:unknown){return this.canvas.read(r.administrator,id,query);}
  @Post('production-plans/:id/canvas-layout') @HttpCode(200)
  saveCanvas(@Req() r:AdminRequest,@Param('id') id:string,@Body() body:unknown,@Query() query:unknown){
    parseInput(CatalogMetadataQuerySchema,query);return this.canvas.save(r.administrator,id,body);
  }
  @Get('products/:id/production-plans')
  list(@Req() r: AdminRequest, @Param('id') id: string, @Query() query: unknown) { return this.plans.list(r.administrator, id, query); }
  @Post('products/:id/production-plans') @HttpCode(200)
  save(@Req() r: AdminRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.plans.save(r.administrator, id, body);
  }
  @Post('products/:id/production-plans/validate') @HttpCode(200)
  validate(@Req() r: AdminRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: unknown) { return this.plans.validate(r.administrator, id, body, query); }
  @Get('production-plans/:id')
  read(@Req() r: AdminRequest, @Param('id') id: string, @Query() query: unknown) { return this.plans.read(r.administrator, id, query); }
  @Get('production-plans/:id/inspection')
  inspection(@Req() r: AdminRequest, @Param('id') id: string, @Query() query: unknown) { return this.plans.inspection(r.administrator, id, query); }
}
