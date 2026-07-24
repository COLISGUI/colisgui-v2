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

  // ---------------- CORS ----------------
  // Tolérant : ignore les barres obliques finales, les espaces et la casse.
  // Journalise les origines autorisées ET chaque refus (diagnostic Railway).
  const corsLogger = new Logger('CORS');
  const normalize = (u: string) => u.trim().replace(/\/+$/, '').toLowerCase();
  const raw = (process.env.CORS_ORIGINS ?? '*').split(',').map(normalize).filter(Boolean);
  const allowAll = raw.includes('*');
  const patterns = raw.filter((o) => o !== '*');

  if (allowAll) {
    corsLogger.warn("CORS OUVERT A TOUTES LES ORIGINES (CORS_ORIGINS='*'). A restreindre en production.");
  } else {
    corsLogger.log(`Origines autorisées (${patterns.length}) : ${patterns.join(' | ') || '(aucune)'}`);
  }

  app.enableCors({
    credentials: true,
    origin: allowAll
      ? true
      : (origin, cb) => {
          if (!origin) return cb(null, true); // appels serveur-à-serveur / curl
          const o = normalize(origin);
          const ok = patterns.some((p) =>
            p.includes('*')
              ? new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(o)
              : p === o,
          );
          if (ok) return cb(null, true);
          corsLogger.warn(`REFUS CORS — origine reçue : "${origin}" | autorisées : ${patterns.join(' | ')}`);
          return cb(null, false);
        },
  });

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
  const log = new Logger('Bootstrap');
  log.log(`ColisGui API démarrée — écoute sur 0.0.0.0:${port} (${process.env.NODE_ENV ?? 'development'})`);
  log.log(`Healthcheck disponible sur : /api/v1/health`);
}
bootstrap();
