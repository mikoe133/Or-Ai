import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './common/configure-app';
import { APP_CONFIG, type AppConfiguration } from './config/configuration';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const configuration = app.get<AppConfiguration>(APP_CONFIG);
  await app.listen(configuration.port, configuration.host);
}

main().catch(() => {
  new Logger('Bootstrap').error('API startup failed; check configuration and runtime dependencies');
  process.exitCode = 1;
});
