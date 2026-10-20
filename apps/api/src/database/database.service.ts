import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { createDatabaseClient } from './client';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly connection: ReturnType<typeof createDatabaseClient>;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(APP_CONFIG) configuration: AppConfiguration) {
    this.connection = createDatabaseClient(configuration);
    this.connection.pool.on('error', () => this.logger.warn('Database connection interrupted'));
  }

  get client() { return this.connection.client; }

  async ping(): Promise<boolean> {
    try {
      // This is a fixed, parameter-free health query, never request-derived SQL.
      const result = await this.client.$queryRawUnsafe<{ value: number }[]>('SELECT 1 AS value');
      return result[0]?.value === 1;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection.close();
  }
}
