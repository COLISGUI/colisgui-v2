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

  // CORS : liste d'origines séparées par des virgules.
  // Les jokers sont acceptés, ex. https://*.netlify.app (utile pour les déploiements
  // de prévisualisation Netlify, dont l'URL change à chaque publication).
  const raw = (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()).filter(Boolean);
  const corsOrigin = raw.includes('*')
    ? true
    : raw.map((o) =>
        o.includes('*')
          ? new RegExp('^' + o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
          : o,
      );
  app.enableCors({ origin: corsOrigin, credentials: true });

  app.setGlobalPrefix('api/v1');
  // whitelist retire les champs inconnus ; forbidNonWhitelisted N'EST PAS activé car
  // plusieurs endpoints combinent @Query() PaginationDto avec des filtres (@Query('statut')…),
  // ce qui déclencherait des rejets 400 injustifiés.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  // '0.0.0.0' est indispensable en conteneur (Railway/Docker) : sans cela,
  // le service peut n'écouter que sur localhost et paraître injoignable.
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`ColisGui API en écoute sur le port ${port} (${process.env.NODE_ENV ?? 'development'})`);
}
bootstrap();
