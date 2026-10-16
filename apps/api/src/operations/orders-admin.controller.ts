import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { DeliveryAdminService } from '../redemption/delivery-admin.service';
import { AdminRequestGuard, type AdminRequest } from './admin-request.guard';
import { OrdersAdminService } from './orders-admin.service';

@Controller('admin')
@UseGuards(AdminRequestGuard)
export class OrdersAdminController {
  constructor(private readonly orders: OrdersAdminService, private readonly delivery: DeliveryAdminService) {}
  @Get('orders')
  list(@Req() r: AdminRequest, @Query() query: unknown) { return this.orders.list(r.administrator, query); }
  @Post('orders') @HttpCode(200)
  record(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.delivery.recordOrder(r.administrator, body);
  }
  @Post('orders/import') @HttpCode(200)
  importCsv(@Req() r: AdminRequest, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.orders.importCsv(r.administrator, body);
  }
  @Get('orders/:id')
  detail(@Req() r: AdminRequest, @Param('id') id: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.orders.detail(r.administrator, id);
  }
  @Post('orders/:id/issue') @HttpCode(200)
  async issue(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const result = await this.delivery.issueOrder(r.administrator, id, body);
    if (result.deliveryAvailable) response.setHeader('Content-Disposition', 'attachment; filename="delivery.json"');
    return result;
  }
  @Post('codes/:id/replace') @HttpCode(200)
  async replace(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown, @Res({ passthrough: true }) response: Response) {
    parseInput(CatalogMetadataQuerySchema, query);
    const result = await this.delivery.replaceCode(r.administrator, id, body);
    if (result.deliveryAvailable) response.setHeader('Content-Disposition', 'attachment; filename="replacement.json"');
    return result;
  }
  @Post('orders/:id/refund') @HttpCode(200)
  refund(@Req() r: AdminRequest, @Param('id') id: unknown, @Body() body: unknown, @Query() query: unknown) {
    parseInput(CatalogMetadataQuerySchema, query); return this.delivery.refundOrder(r.administrator, id, body);
  }
}
