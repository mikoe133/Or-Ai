import { Module } from '@nestjs/common';
import { RedemptionModule } from '../redemption/redemption.module';
import { AccountCoreModule } from './account-core.module';
import { AccountsController } from './accounts.controller';
import { DatabaseModule } from '../database/database.module';
import { AccountEntitlementsService } from './account-entitlements.service';
import { AccountBindingService } from './account-binding.service';

@Module({ imports: [AccountCoreModule, RedemptionModule, DatabaseModule], controllers: [AccountsController],
  providers: [AccountEntitlementsService, AccountBindingService], exports: [AccountEntitlementsService] })
export class AccountsModule {}
