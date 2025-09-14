import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Security headers (helmet) - disable CSP for swagger compatibility initially
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS configuration
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  // app.enableCors({
  //   origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  //   credentials: true,
  // });

  app.enableCors({
  origin: ['http://localhost:3000','http://192.168.8.152:3000'],
  credentials: true,
});


  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  setupSwagger(app);

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  const logger = app.get(Logger);
  logger.log(`Server listening on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Bootstrap error', err);
  process.exit(1);
});
