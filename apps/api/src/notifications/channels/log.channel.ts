import { Logger } from '@nestjs/common';
import { NotificationChannel, SendResult } from './notification-channel.interface';

// Fournisseur de repli : aucun identifiant configuré -> on journalise seulement.
export class LogChannel implements NotificationChannel {
  readonly name = 'log';
  private logger = new Logger('Notifications');
  async send(to: string, titre: string, contenu: string): Promise<SendResult> {
    this.logger.log(`[SIMULATION] -> ${to} | ${titre} | ${contenu}`);
    return { ok: true, ref: 'simulated' };
  }
}
