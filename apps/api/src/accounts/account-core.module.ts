import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SupabaseAuthGateway } from './supabase-auth.gateway';
import { AccountIdentityService } from './account-identity.service';
import { AccountCookiesService } from './account-cookies.service';
import { AccountSessionsService } from './account-sessions.service';

@Module({ imports: [DatabaseModule], providers: [SupabaseAuthGateway, AccountIdentityService, AccountCookiesService, AccountSessionsService],
  exports: [SupabaseAuthGateway, AccountIdentityService, AccountCookiesService, AccountSessionsService] })
export class AccountCoreModule {}
