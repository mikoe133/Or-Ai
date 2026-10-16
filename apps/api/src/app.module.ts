import { Module } from '@nestjs/common';
import { ConfigurationModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './catalog/catalog.module';
import { RedemptionModule } from './redemption/redemption.module';
import { RuntimeModule } from './runtime/runtime.module';
import { AccountsModule } from './accounts/accounts.module';
import { OperationsModule } from './operations/operations.module';

@Module({ imports: [ConfigurationModule, HealthModule, CatalogModule, RedemptionModule, RuntimeModule, AccountsModule, OperationsModule] })
export class AppModule {}
