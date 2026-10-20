import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema, CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { ContentService } from './content.service';
import { ContentWorkflowService } from './content-workflow.service';
import { ContentPackagesService } from './content-packages.service';
import { FileCleanupService } from './file-cleanup.service';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class ContentController {
  constructor(private readonly content: ContentService, private readonly workflow: ContentWorkflowService, private readonly packages: ContentPackagesService, private readonly cleanup: FileCleanupService) {}
  @Get('products/:id/creative-profiles')
  profiles(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) { return this.content.profiles(r.administrator, id, query); }
  @Post('products/:id/creative-profiles') @HttpCode(200)
  saveProfile(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.content.saveProfile(r.administrator, id, body);
  }
  @Get('creative-profiles/:id')
  profile(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.content.readProfile(r.administrator, id);
  }
  @Get('content-revisions')
  revisions(@Req() r: AdminRequest, @Query() query: unknown) { return this.content.list(r.administrator, query); }
  @Get('content-revisions/:id')
  revision(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.content.read(r.administrator, id);
  }
  @Post('content-assets') @HttpCode(200)
  asset(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.content.saveAsset(r.administrator, body);
  }
  @Get('content-references')
  references(@Req() r: AdminRequest, @Query() query: unknown) { return this.content.references(r.administrator, query); }
  @Get('production-records')
  productions(@Req() r: AdminRequest, @Query() query: unknown) { return this.content.productions(r.administrator, query); }
  @Post('production-records') @HttpCode(200)
  production(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.content.recordProduction(r.administrator, body);
  }
  @Post('content-contexts/resolve') @HttpCode(200)
  context(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.content.context(r.administrator, body);
  }
  @Get('content-revisions/:id/impact')
  impact(@Req() r:AdminRequest,@Param('id') id:string,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.workflow.impact(r.administrator,id);}
  @Get('content-revisions/:id/diff')
  diff(@Req() r:AdminRequest,@Param('id') id:string,@Query() query:unknown){const body=parseInput(z.object({to:IdSchema}).strict(),query);return this.workflow.diff(r.administrator,id,body.to);}
  @Post('content-revisions/:id/recheck') @HttpCode(200)
  recheck(@Req() r:AdminRequest,@Param('id') id:string,@Body() body:unknown,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.workflow.review(r.administrator,id,body);}
  @Post('content-packages/preview') @HttpCode(200)
  packagePreview(@Req() r:AdminRequest,@Body() body:unknown,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.packages.preview(r.administrator,body);}
  @Post('content-packages') @HttpCode(200)
  adopt(@Req() r:AdminRequest,@Body() body:unknown,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.packages.adopt(r.administrator,body);}
  @Get('content-packages/:id')
  package(@Req() r:AdminRequest,@Param('id') id:unknown,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.packages.read(r.administrator,id);}
  @Get('products/:id/content-packages')
  packagesList(@Req() r:AdminRequest,@Param('id') id:unknown,@Query() q:unknown){return this.packages.list(r.administrator,id,q);}
  @Get('products/:id/cleanup-candidates')
  cleanupCandidates(@Req() r:AdminRequest,@Param('id') id:unknown,@Query() q:unknown){return this.cleanup.candidates(r.administrator,id,q);}
  @Post('file-cleanups/preview') @HttpCode(200)
  cleanupPreview(@Req() r:AdminRequest,@Body() body:unknown,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.cleanup.preview(r.administrator,body);}
  @Get('file-cleanups/:id')
  cleanupPlan(@Req() r:AdminRequest,@Param('id') id:unknown,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.cleanup.read(r.administrator,id);}
  @Post('file-cleanups/:id/execute') @HttpCode(200)
  cleanupExecute(@Req() r:AdminRequest,@Param('id') id:unknown,@Body() body:unknown,@Query() q:unknown){parseInput(CatalogMetadataQuerySchema,q);return this.cleanup.execute(r.administrator,id,body);}

  @Get('creative-profiles/:id/diff')
  profileDiff(@Req() r:AdminRequest,@Param('id') id:string,@Query() query:unknown){const body=parseInput(z.object({to:IdSchema}).strict(),query);return this.workflow.profileDiff(r.administrator,id,body.to);}

}
