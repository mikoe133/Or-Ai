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
import { PublicAssetsController } from './public-assets.controller';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ContentWorkflowService } from './content-workflow.service';
import { ContentPackagesService } from './content-packages.service';
import { FileCleanupService } from './file-cleanup.service';

@Module({ imports: [DatabaseModule, AccountCoreModule, CatalogModule, RedemptionModule],
  controllers: [CatalogAdminController, OrdersAdminController, MediaAdminController, OverviewController, EventsController, PublicAssetsController, ContentController],
  providers: [AdminRequestGuard, AdminMutationService, CatalogAdminService, OrdersAdminService, AssetsService, FilesService,
    { provide: AssetStorage, useClass: LocalAssetStorage }, OverviewService, ContentService, ContentWorkflowService, ContentPackagesService, FileCleanupService] })
export class OperationsModule {}
