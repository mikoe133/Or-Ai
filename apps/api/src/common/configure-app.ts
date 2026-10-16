import { RequestMethod, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ApiException, HttpErrorFilter } from './http-errors';
import { requestContext } from './request-context';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';

export function configureApp(app: INestApplication): void {
  const configuration = app.get<AppConfiguration>(APP_CONFIG);
  app.getHttpAdapter().getInstance().set('trust proxy', configuration.security.trustedProxyCidrs.length ? configuration.security.trustedProxyCidrs : false);
  app.use(requestContext);
  // Bounded JSON for configuration and 500-row CSV imports. Binary file bodies
  // remain unread until the protected upload handler streams them to storage.
  (app as NestExpressApplication).useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api', { exclude: [
    { path: 'health/live', method: RequestMethod.GET },
    { path: 'health/ready', method: RequestMethod.GET },
  ] });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: () => new ApiException('VALIDATION_ERROR', '提交内容格式不正确', 400),
  }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
}
