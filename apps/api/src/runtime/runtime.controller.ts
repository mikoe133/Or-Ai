import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { FeedbackQuerySchema, StartAttemptRequestSchema } from '@orai/contracts/private';
import { parseInput } from '../common/parse-input';
import { BrowserRequestGuard, type BrowserRequest } from '../redemption/browser-request.guard';
import { ConsumerAccessService } from './consumer-access.service';
import { AttemptsService } from './attempts.service';
import { FeedbackService } from './feedback.service';
import { ReportsService } from './reports.service';
import { ExperienceResourcesService } from './experience-resources.service';
import { mediaResponse } from '../operations/media-admin.controller';

@Controller('attempts')
@UseGuards(BrowserRequestGuard)
export class AttemptsController {
  constructor(private readonly access: ConsumerAccessService, private readonly attempts: AttemptsService, private readonly feedback: FeedbackService,
    private readonly resources: ExperienceResourcesService) {}
  @Get(':id/resources/:resourceId')
  async resource(@Req() request: BrowserRequest, @Param('id') id: unknown, @Param('resourceId') resourceId: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    response.setHeader('Cache-Control', 'private, no-store');
    return mediaResponse(await this.resources.read(await this.access.forRequest(request, 'attempt', id), 'attempt', id, resourceId, request.headers.range), response);
  }
  @Post() @HttpCode(200)
  async start(@Req() request: BrowserRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    const input = parseInput(StartAttemptRequestSchema, body);
    return this.attempts.start(await this.access.forRequest(request, 'entitlement', input.entitlementId), input);
  }
  @Get(':id/questions')
  async questions(@Req() request: BrowserRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.attempts.questions(await this.access.forRequest(request, 'attempt', id), id);
  }
  @Put(':id/answers/:questionId')
  async save(@Req() request: BrowserRequest, @Param('id') id: unknown, @Param('questionId') questionId: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.attempts.save(await this.access.forRequest(request, 'attempt', id), id, questionId, body);
  }
  @Get(':id/feedback')
  async distribution(@Req() request: BrowserRequest, @Param('id') id: unknown, @Query() query: unknown) {
    const input = parseInput(FeedbackQuerySchema, query);
    return this.feedback.read(await this.access.forRequest(request, 'attempt', id), id, input.questionId);
  }
  @Post(':id/submit') @HttpCode(200)
  async submit(@Req() request: BrowserRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.attempts.submit(await this.access.forRequest(request, 'attempt', id), id, body);
  }
}
@Controller('reports')
@UseGuards(BrowserRequestGuard)
export class ReportsController {
  constructor(private readonly access: ConsumerAccessService, private readonly reports: ReportsService, private readonly resources: ExperienceResourcesService) {}
  @Get(':id/resources/:resourceId')
  async resource(@Req() request: BrowserRequest, @Param('id') id: unknown, @Param('resourceId') resourceId: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    response.setHeader('Cache-Control', 'private, no-store');
    return mediaResponse(await this.resources.read(await this.access.forRequest(request, 'report', id), 'report', id, resourceId, request.headers.range), response);
  }
  @Get(':id')
  async read(@Req() request: BrowserRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    return this.reports.read(await this.access.forRequest(request, 'report', id), id);
  }
  @Delete(':id') @HttpCode(204)
  async remove(@Req() request: BrowserRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query);
    await this.reports.remove(await this.access.forRequest(request, 'report', id), id, body);
  }
}
