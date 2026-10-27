import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { Response } from "express";
import { CatalogMetadataQuerySchema } from "@orai/contracts";
import { SkillPurposeSchema } from "@orai/contracts/admin";
import { parseInput } from "../common/parse-input";
import { AdminRequestGuard, type AdminRequest } from "./admin-request.guard";
import { SkillBindingsService } from "./skill-bindings.service";
import { mediaResponse } from "./media-admin.controller";

@Controller("admin")
@UseGuards(AdminRequestGuard)
export class SkillBindingsController {
  constructor(private readonly bindings: SkillBindingsService) {}
  @Get("creative-profiles/:id/skill-sets")
  list(@Req() r: AdminRequest, @Param("id") id: string, @Query() q: unknown) {
    return this.bindings.list(r.administrator, id, q);
  }
  @Post("creative-profiles/:id/skill-sets")
  @HttpCode(200)
  save(
    @Req() r: AdminRequest,
    @Param("id") id: string,
    @Query() q: unknown,
    @Body() b: unknown,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.bindings.save(r.administrator, id, b);
  }
  @Get("creative-skill-sets/:id")
  read(@Req() r: AdminRequest, @Param("id") id: string, @Query() q: unknown) {
    parseInput(CatalogMetadataQuerySchema, q);
    return this.bindings.read(r.administrator, id);
  }
  @Get("creative-skill-sets/:id/domains/:domain")
  domain(
    @Req() r: AdminRequest,
    @Param("id") id: string,
    @Param("domain") d: string,
    @Query() q: unknown,
  ) {
    const { purpose } = parseInput(
      z.object({ purpose: SkillPurposeSchema.optional() }).strict(),
      q,
    );
    return this.bindings.domain(r.administrator, id, d, purpose);
  }
  @Get(
    "creative-skill-sets/:id/domains/:domain/:purpose/references/:fileId/content",
  )
  async reference(
    @Req() r: AdminRequest,
    @Param("id") id: string,
    @Param("domain") d: string,
    @Param("purpose") p: string,
    @Param("fileId") f: string,
    @Query() q: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    parseInput(CatalogMetadataQuerySchema, q);
    const file = await this.bindings.reference(
      r.administrator,
      id,
      d,
      p,
      f,
      r.headers.range,
    );
    const stream = mediaResponse(file, res);
    res.setHeader(
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
