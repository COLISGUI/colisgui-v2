import { Logger } from '@nestjs/common';
import { NotificationChannel, SendResult } from './notification-channel.interface';

// WhatsApp Cloud API (Meta). Requiert WHATSAPP_TOKEN et WHATSAPP_PHONE_ID.
export class WhatsappChannel implements NotificationChannel {
  readonly name = 'whatsapp';
  private logger = new Logger('WhatsApp');
  constructor(private token: string, private phoneId: string) {}

  private normalize(phone: string): string {
    let p = phone.replace(/[^0-9]/g, '');
    if (!p.startsWith('224') && p.length === 9) p = '224' + p; // Guinée
    return p;
  }

  async send(to: string, titre: string, contenu: string): Promise<SendResult> {
    const url = `https://graph.facebook.com/v20.0/${this.phoneId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to: this.normalize(to),
      type: 'text',
      text: { body: `*${titre}*\n${contenu}` },
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: any = await res.json();
      if (!res.ok) {
        this.logger.warn(`Échec WhatsApp: ${JSON.stringify(data)}`);
        return { ok: false, error: data?.error?.message ?? 'Erreur WhatsApp' };
      }
      return { ok: true, ref: data?.messages?.[0]?.id };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Erreur réseau WhatsApp' };
    }
  }
}
