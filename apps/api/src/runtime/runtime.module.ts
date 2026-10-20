import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CatalogModule } from '../catalog/catalog.module';
import { RedemptionModule } from '../redemption/redemption.module';
import { OwnedRuntimeService } from './owned-runtime.service';
import { StatContributionsService } from './stat-contributions.service';
import { FeedbackService } from './feedback.service';
import { AttemptsService } from './attempts.service';
import { ReportsService } from './reports.service';
import { RetentionService } from './retention.service';
import { AttemptsController, ReportsController } from './runtime.controller';
import { AccountCoreModule } from '../accounts/account-core.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ConsumerAccessService } from './consumer-access.service';

@Module({ imports: [DatabaseModule, CatalogModule, RedemptionModule, AccountCoreModule, AccountsModule], controllers: [AttemptsController, ReportsController],
  providers: [ConsumerAccessService, OwnedRuntimeService, StatContributionsService, FeedbackService, AttemptsService, ReportsService, RetentionService],
  exports: [AttemptsService, FeedbackService, ReportsService, RetentionService] })
export class RuntimeModule {}
