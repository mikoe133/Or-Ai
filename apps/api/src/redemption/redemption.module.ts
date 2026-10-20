import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CatalogModule } from '../catalog/catalog.module';
import { BrowserSecurityService } from './browser-security.service';
import { BrowserRequestGuard } from './browser-request.guard';
import { RequestRateService } from './request-rate.service';
import { SessionsService } from './sessions.service';
import { EntitlementMetadataService } from './entitlement-metadata.service';
import { EntitlementAccessService } from './entitlement-access.service';
import { RedemptionService } from './redemption.service';
import { RedemptionController, AnonymousSessionController } from './redemption.controller';
import { DeliveryAdminService } from './delivery-admin.service';
import { InvalidateAttemptsService } from './invalidate-attempts.service';
@Module({ imports: [DatabaseModule, CatalogModule], controllers: [RedemptionController, AnonymousSessionController],
  providers: [BrowserSecurityService, BrowserRequestGuard, RequestRateService, SessionsService, EntitlementMetadataService, EntitlementAccessService, RedemptionService, DeliveryAdminService, InvalidateAttemptsService],
  exports: [BrowserSecurityService, BrowserRequestGuard, RequestRateService, SessionsService, EntitlementMetadataService, EntitlementAccessService, DeliveryAdminService, InvalidateAttemptsService] })
export class RedemptionModule {}
