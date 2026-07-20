import { Injectable, Logger } from '@nestjs/common';
import { NotifCanal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from './channels/notification-channel.interface';
import { LogChannel } from './channels/log.channel';
import { WhatsappChannel } from './channels/whatsapp.channel';
import { SmsChannel } from './channels/sms.channel';

interface CreateNotif {
  destinataireType: 'USER' | 'PARTENAIRE' | 'LIVREUR';
  destinataireId: string;
  canal: NotifCanal;
  titre: string;
  contenu: string;
}

@Injectable()
export class NotificationsService {
  private logger = new Logger('NotificationsService');
  private whatsapp: NotificationChannel;
  private sms: NotificationChannel;
  private log = new LogChannel();

  constructor(private prisma: PrismaService) {
    // Repli automatique sur le canal "log" si les identifiants manquent.
    this.whatsapp = process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID
      ? new WhatsappChannel(process.env.WHATSAPP_TOKEN, process.env.WHATSAPP_PHONE_ID)
      : this.log;
    this.sms = process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM
      ? new SmsChannel(process.env.TWILIO_SID, process.env.TWILIO_TOKEN, process.env.TWILIO_FROM)
      : this.log;
  }

  // Persiste une notification en attente (à envoyer via dispatchPending).
  create(data: CreateNotif) {
    return this.prisma.notification.create({ data: { ...data, statut: 'EN_ATTENTE' } });
  }

  // Envoie immédiatement une notification (persiste puis dispatch).
  async sendNow(data: CreateNotif) {
    const notif = await this.create(data);
    await this.dispatchOne(notif.id);
    return this.prisma.notification.findUnique({ where: { id: notif.id } });
  }

  private channelFor(canal: NotifCanal): NotificationChannel {
    if (canal === 'WHATSAPP') return this.whatsapp;
    if (canal === 'SMS') return this.sms;
    return this.log; // EMAIL / IN_APP -> journalisé (à implémenter selon besoin)
  }

  private async resolvePhone(type: string, id: string): Promise<string | null> {
    if (type === 'PARTENAIRE') return (await this.prisma.partenaire.findUnique({ where: { id } }))?.telephone ?? null;
    if (type === 'LIVREUR') return (await this.prisma.livreur.findUnique({ where: { id } }))?.telephone ?? null;
    if (type === 'USER') return (await this.prisma.user.findUnique({ where: { id } }))?.telephone ?? null;
    return null;
  }

  private async dispatchOne(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.statut === 'ENVOYE') return;
    const phone = await this.resolvePhone(notif.destinataireType, notif.destinataireId);
    if (!phone) {
      await this.prisma.notification.update({ where: { id }, data: { statut: 'ECHEC' } });
      return;
    }
    const channel = this.channelFor(notif.canal);
    const result = await channel.send(phone, notif.titre, notif.contenu);
    await this.prisma.notification.update({
      where: { id },
      data: { statut: result.ok ? 'ENVOYE' : 'ECHEC' },
    });
  }

  // Traite les notifications en attente (appelé après livraison, ou via CRON/endpoint).
  async dispatchPending(limit = 50) {
    const pending = await this.prisma.notification.findMany({
      where: { statut: 'EN_ATTENTE' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    for (const n of pending) {
      try { await this.dispatchOne(n.id); } catch (e) { this.logger.warn(`Notif ${n.id}: ${e}`); }
    }
    return { traitees: pending.length };
  }

  list(destinataireId?: string) {
    const where = destinataireId ? { destinataireId } : {};
    return this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { lu: true } });
  }
}
