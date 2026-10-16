import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { AdminReplaceVersionSchema } from '@orai/contracts/admin';
import { parseInput } from '../common/parse-input';
import { VersionsService } from '../catalog/versions.service';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { CatalogAdminService } from './catalog-admin.service';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogAdminService, private readonly versions: VersionsService) {}
  @Get('categories')
  categories(@Req() r: AdminRequest, @Query() query: unknown) { return this.catalog.taxonomy(r.administrator, 'categories', query); }
  @Post('categories') @HttpCode(200)
  createCategory(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.catalog.createTaxonomy(r.administrator, 'categories', body);
  }
  @Patch('categories/:id')
  patchCategory(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.catalog.patchTaxonomy(r.administrator, 'categories', id, body);
  }
  @Get('tags')
  tags(@Req() r: AdminRequest, @Query() query: unknown) { return this.catalog.taxonomy(r.administrator, 'tags', query); }
  @Post('tags') @HttpCode(200)
  createTag(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.catalog.createTaxonomy(r.administrator, 'tags', body);
  }
  @Patch('tags/:id')
  patchTag(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.catalog.patchTaxonomy(r.administrator, 'tags', id, body);
  }
  @Get('products')
  products(@Req() r: AdminRequest, @Query() query: unknown) { return this.catalog.products(r.administrator, query); }
  @Post('products') @HttpCode(200)
  create(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.catalog.create(r.administrator, body);
  }
  @Get('products/:id')
  product(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.catalog.product(r.administrator, id);
  }
  @Patch('products/:id')
  patch(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.catalog.patch(r.administrator, id, body);
  }
  @Get('products/:id/versions')
  listVersions(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) { return this.catalog.versions(r.administrator, id, query); }
  @Post('products/:id/versions') @HttpCode(200)
  importVersion(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.versions.importConfiguration(r.administrator, id, body);
  }
  @Get('products/:id/versions/:versionId/preview')
  preview(@Req() r: AdminRequest, @Param('id') id: unknown, @Param('versionId') version: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.versions.preview(r.administrator, id, version);
  }
  @Put('products/:id/versions/:versionId')
  replace(@Req() r: AdminRequest, @Param('id') id: unknown, @Param('versionId') version: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.versions.replaceDraft(r.administrator, id, version, parseInput(AdminReplaceVersionSchema, body));
  }
  @Post('products/:id/versions/:versionId/review') @HttpCode(200)
  review(@Req() r: AdminRequest, @Param('id') id: unknown, @Param('versionId') version: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.versions.review(r.administrator, id, version, body);
  }
  @Post('products/:id/versions/:versionId/publish') @HttpCode(200)
  publish(@Req() r: AdminRequest, @Param('id') id: unknown, @Param('versionId') version: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.versions.publish(r.administrator, id, version, body);
  }
  @Post('products/:id/archive') @HttpCode(200)
  archive(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.versions.archive(r.administrator, id, body);
  }
}
