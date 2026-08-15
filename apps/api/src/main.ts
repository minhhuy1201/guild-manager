import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import {
  AllExceptionsFilter,
  LoggingInterceptor,
  TransformInterceptor,
} from './common';
import { API_PREFIX, SWAGGER_PATH, type Env } from './config';

/**
 * Khởi động HTTP server: gắn pipe/filter/interceptor toàn cục, CORS, Swagger
 * và bật graceful shutdown.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.enableShutdownHooks();

  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  if (!isProduction) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Guild Manager API')
        .setDescription('API điểm danh và quản lý bang hội')
        .setVersion('1.0')
        .build(),
    );
    SwaggerModule.setup(SWAGGER_PATH, app, document);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API đang chạy tại http://localhost:${port}/${API_PREFIX}`);

  if (!isProduction) {
    logger.log(`Swagger UI: http://localhost:${port}/${SWAGGER_PATH}`);
  }
}

void bootstrap();
