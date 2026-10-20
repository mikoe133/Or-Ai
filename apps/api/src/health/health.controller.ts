import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { HealthResponse } from '@orai/contracts';
import type { ContextRequest } from '../common/request-context';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('live')
  live(@Req() request: ContextRequest): HealthResponse {
    return { status: 'ok', requestId: request.requestId };
  }

  @Get('ready')
  async ready(@Req() request: ContextRequest, @Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const databaseUp = await this.database.ping();
    response.status(databaseUp ? 200 : 503);
    return {
      status: databaseUp ? 'ok' : 'unavailable',
      requestId: request.requestId,
      checks: { database: databaseUp ? 'up' : 'down' },
    };
  }
}
