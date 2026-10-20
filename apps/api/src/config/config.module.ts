import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfiguration } from './configuration';

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfiguration() }],
  exports: [APP_CONFIG],
})
export class ConfigurationModule {}
