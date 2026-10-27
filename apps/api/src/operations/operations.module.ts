import {ProductionRunOperationsService} from './production-run-operations.service';
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
import { R2AssetStorage } from './r2-asset-storage';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { MediaAdminController } from './media-admin.controller';
import { OverviewService } from './overview.service';
import { EventsController, OverviewController } from './overview.controller';
import { PublicAssetsController } from './public-assets.controller';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ContentWorkflowService } from './content-workflow.service';
import { ContentPackagesService } from './content-packages.service';
import { FileCleanupService } from './file-cleanup.service';
import {SkillsService} from './skills.service';
import { SkillUpgradeService } from './skill-upgrade.service';
import {SkillFilesService} from './skill-files.service';
import {SkillsController} from './skills.controller';
import { SkillBindingsService } from './skill-bindings.service';
import { SkillBindingsController } from './skill-bindings.controller';
import { MachineCredentialsService } from './machine-credentials.service';
import { MachineCredentialsController } from './machine-credentials.controller';
import { MachineRequestGuard } from './machine-request.guard';
import { MachineUploadService } from './machine-upload.service';
import { MachineController } from './machine.controller';
import { MachineContentService } from './machine-content.service';
import { ExperienceAuthoringService } from './experience-authoring.service';
import { ExperienceAuthoringController } from './experience-authoring.controller';
import { MachineExperienceService } from './machine-experience.service';
import { ProductionPlansService } from './production-plans.service';
import { ProductionPlansController } from './production-plans.controller';
import { ProductionRunsService, productionRunClock } from './production-runs.service';
import { ProductionRunsController } from './production-runs.controller';
import { ProjectReviewService } from './project-review.service';
import { ProjectReviewController } from './project-review.controller';
import { ProjectOriginalFilesService } from './project-original-files.service';
import { ProjectOriginalFilesController } from './project-original-files.controller';
import { MachineProjectsService } from './machine-projects.service';
import { MachineWorkspacesController } from './machine-workspaces.controller';
import { ProjectProductionService } from './project-production.service';
import { ProjectProductionController } from './project-production.controller';
import { ProjectMethodOperationsService } from './project-method-operations.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import { ProjectWorkspaceController } from './project-workspace.controller';
import { ProjectCanvasService } from './project-canvas.service';
import { CodexConnectionsService } from './codex-connections.service';
import { CodexConnectionsController } from './codex-connections.controller';
import {ExternalRunConfigurationsController} from './external-run-configurations.controller';
import {ExternalRunConfigurationsService,externalConfigurationClock} from './external-run-configurations.service';

@Module({ imports: [DatabaseModule, AccountCoreModule, CatalogModule, RedemptionModule],
  controllers: [ExternalRunConfigurationsController, CodexConnectionsController, CatalogAdminController, OrdersAdminController, MediaAdminController, OverviewController, EventsController, PublicAssetsController, ContentController, SkillsController, SkillBindingsController, MachineCredentialsController, MachineController, ExperienceAuthoringController, ProductionPlansController, ProjectProductionController, MachineWorkspacesController, ProjectOriginalFilesController, ProjectReviewController, ProductionRunsController, ProjectWorkspaceController],
  providers: [ProductionRunOperationsService,AdminRequestGuard, AdminMutationService, CatalogAdminService, OrdersAdminService, AssetsService, FilesService,
    { provide: AssetStorage, inject: [APP_CONFIG], useFactory: (configuration: AppConfiguration) =>
      configuration.assets?.driver === 'r2' ? new R2AssetStorage(configuration) : new LocalAssetStorage(configuration) },
    OverviewService, ContentService, ContentWorkflowService, ContentPackagesService, FileCleanupService, SkillsService, SkillUpgradeService, SkillFilesService, SkillBindingsService,
    ExternalRunConfigurationsService, externalConfigurationClock, CodexConnectionsService, MachineCredentialsService, MachineRequestGuard, MachineUploadService, MachineContentService, ExperienceAuthoringService, MachineExperienceService, ProductionPlansService, ProjectProductionService, ProjectMethodOperationsService, MachineProjectsService, ProjectOriginalFilesService, ProjectReviewService, ProductionRunsService, productionRunClock, ProjectWorkspaceService, ProjectCanvasService] })
export class OperationsModule {}
