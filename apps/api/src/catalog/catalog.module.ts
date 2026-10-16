import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogAdminAccessService } from './admin-access.service';
import { VersionsService } from './versions.service';
import { RuntimeVersionService } from './runtime-version.service';
import { AccountCoreModule } from '../accounts/account-core.module';

@Module({ imports: [DatabaseModule, AccountCoreModule], controllers: [CatalogController],
  providers: [CatalogService, CatalogAdminAccessService, VersionsService, RuntimeVersionService],
  exports: [CatalogService, CatalogAdminAccessService, VersionsService, RuntimeVersionService] })
export class CatalogModule {}
