import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  SetMetadata,
  HttpCode,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { IdSchema, CatalogMetadataQuerySchema } from "@orai/contracts";
import { parseInput } from "../common/parse-input";
import {
  AdminRequestGuard,
  BINARY_UPLOAD,
  type AdminRequest,
} from "./admin-request.guard";
import { SkillsService } from "./skills.service";
import { SkillFilesService } from "./skill-files.service";
import { SkillBindingsService } from './skill-bindings.service';
import { mediaResponse } from "./media-admin.controller";
@Controller("admin/skills/:domain")
@UseGuards(AdminRequestGuard)
export class SkillsController {
  constructor(
    private readonly skills: SkillsService,
    private readonly files: SkillFilesService,
    private readonly bindings: SkillBindingsService,
  ) {}
  @Get('candidates') candidates(@Req() r: AdminRequest, @Param('domain') d: string, @Query() q: unknown) {
    return this.bindings.candidates(r.administrator, d, q);
  }
  @Get() list(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Query() q: unknown,
  ) {
    return this.skills.list(r.administrator, d, q);
  }
  @Post() @HttpCode(200) create(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Body() b: unknown,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.skills.create(r.administrator, d, b);
  }
  @Get(":id") read(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.skills.read(r.administrator, d, id);
  }
  @Get(":id/versions") versions(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Query() q: unknown,
  ) {
    return this.skills.versions(r.administrator, d, id, q);
  }
  @Post(":id/versions") @HttpCode(200) clone(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Body() b: unknown,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.skills.clone(r.administrator, d, id, b);
  }
  @Get(":id/versions/:versionId") version(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("versionId") v: string,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.skills.readVersion(r.administrator, d, id, v);
  }
  @Put(":id/versions/:versionId") save(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("versionId") v: string,
    @Body() b: unknown,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.skills.save(r.administrator, d, id, v, b);
  }
  @Post(":id/versions/:versionId/:action") @HttpCode(200) transition(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("versionId") v: string,
    @Param("action") action: string,
    @Body() b: unknown,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.skills.transition(
      r.administrator,
      d,
      id,
      v,
      parseInput(z.enum(["review", "activate", "archive"]), action),
      b,
    );
  }
  @Get(":id/versions/:versionId/diff") diff(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("versionId") v: string,
    @Query() q: unknown,
  ) {
    return this.skills.diff(
      r.administrator,
      d,
      id,
      v,
      parseInput(z.object({ to: IdSchema }).strict(), q).to,
    );
  }
  @Get(":id/versions/:versionId/export") export(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("versionId") v: string,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.skills.export(r.administrator, d, id, v);
  }
  @Post(":id/files") @HttpCode(200) prepare(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Body() b: unknown,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.files.prepare(r.administrator, d, id, b);
  }
  @Get(":id/files/:fileId") status(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("fileId") f: string,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.files.status(r.administrator, d, id, f);
  }
  @Put(":id/files/:fileId/content") @SetMetadata(BINARY_UPLOAD, true) upload(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("fileId") f: string,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.files.upload(r.administrator, d, id, f, r);
  }
  @Post(":id/files/:fileId/complete") @HttpCode(200) complete(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("fileId") f: string,
    @Body() b: unknown,
    @Query() q: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.files.complete(r.administrator, d, id, f, b);
  }
  @Get(":id/files/:fileId/content") async content(
    @Req() r: AdminRequest,
    @Param("domain") d: string,
    @Param("id") id: string,
    @Param("fileId") f: string,
    @Query() q: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    const file = await this.files.content(
      r.administrator,
      d,
      id,
      f,
      r.headers.range,
    );
    const stream = mediaResponse(file, response);
    response.setHeader(
      "Content-Disposition",
      "attachment; filename*=UTF-8''" +
        encodeURIComponent(file.name).replace(
          /['()*]/g,
          (c) => "%" + c.charCodeAt(0).toString(16),
        ),
    );
    return stream;
  }
}
