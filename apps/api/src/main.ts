import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Sécurité HTTP
  app.use(helmet());
  app.use(cookieParser());
  app.set('trust proxy', 1); // derrière Nginx/Railway (throttler, IP réelle)

  // CORS restreint par variable d'environnement (par défaut : tout, en dev)
  const origins = (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim());
  app.enableCors({ origin: origins.includes('*') ? true : origins, credentials: true });

  app.setGlobalPrefix('api/v1');
  // whitelist retire les champs inconnus ; forbidNonWhitelisted N'EST PAS activé car
  // plusieurs endpoints combinent @Query() PaginationDto avec des filtres (@Query('statut')…),
  // ce qui déclencherait des rejets 400 injustifiés.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`ColisGui API en écoute sur le port ${port} (${process.env.NODE_ENV ?? 'development'})`);
}
bootstrap();
