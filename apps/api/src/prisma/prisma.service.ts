import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');
  public dbReady = false;

  async onModuleInit() {
    // Démarrage résilient : si la base est injoignable, l'API démarre quand même
    // afin que /api/v1/health réponde et indique l'origine du problème.
    try {
      await this.$connect();
      this.dbReady = true;
      this.logger.log('Connexion PostgreSQL établie.');
    } catch (e) {
      this.dbReady = false;
      this.logger.error('Connexion PostgreSQL IMPOSSIBLE — vérifiez DATABASE_URL.');
      this.logger.error(String((e as Error)?.message ?? e));
      // Tentatives de reconnexion en arrière-plan (sans bloquer le démarrage).
      const retry = setInterval(async () => {
        try {
          await this.$connect();
          this.dbReady = true;
          this.logger.log('Connexion PostgreSQL rétablie.');
          clearInterval(retry);
        } catch { /* nouvelle tentative au prochain cycle */ }
      }, 10000);
      retry.unref?.();
    }
  }

  async onModuleDestroy() {
    try { await this.$disconnect(); } catch { /* ignore */ }
  }
}
