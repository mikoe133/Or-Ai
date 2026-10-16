import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountCoreModule } from '../accounts/account-core.module';
import { CatalogModule } from '../catalog/catalog.module';
import { RedemptionModule } from '../redemption/redemption.module';
import { AdminRequestGuard } from './admin-request.guard';
import { AdminMutationService } from './admin-mutation.service';
import { CatalogAdminService } from './catalog-admin.service';
import { CatalogAdminController } from './catalog-admin.controller';
import { OrdersAdminService } from './orders-admin.service';
import { OrdersAdminController } from './orders-admin.controller';
import { AssetsService } from './assets.service';
import { FilesService } from './files.service';
import { AssetStorage, LocalAssetStorage } from './asset-storage';
import { MediaAdminController } from './media-admin.controller';
import { OverviewService } from './overview.service';
import { EventsController, OverviewController } from './overview.controller';

@Module({ imports: [DatabaseModule, AccountCoreModule, CatalogModule, RedemptionModule],
  controllers: [CatalogAdminController, OrdersAdminController, MediaAdminController, OverviewController, EventsController],
  providers: [AdminRequestGuard, AdminMutationService, CatalogAdminService, OrdersAdminService, AssetsService, FilesService,
    { provide: AssetStorage, useClass: LocalAssetStorage }, OverviewService] })
export class OperationsModule {}
