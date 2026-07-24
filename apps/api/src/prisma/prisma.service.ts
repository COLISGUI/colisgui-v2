import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');
  public dbReady = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.dbReady = true;
      this.logger.log('Connexion PostgreSQL etablie.');
    } catch (e) {
      this.dbReady = false;
      this.logger.error('Connexion PostgreSQL IMPOSSIBLE — verifiez DATABASE_URL.');
      const retry = setInterval(async () => {
        try {
          await this.$connect();
          this.dbReady = true;
          this.logger.log('Connexion PostgreSQL retablie.');
          clearInterval(retry);
        } catch { /* nouvelle tentative */ }
      }, 10000);
    }
  }

  async onModuleDestroy() {
    try { await this.$disconnect(); } catch { /* ignore */ }
  }
}
