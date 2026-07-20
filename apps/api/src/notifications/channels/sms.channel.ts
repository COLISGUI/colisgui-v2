import { Logger } from '@nestjs/common';
import { NotificationChannel, SendResult } from './notification-channel.interface';

// SMS via Twilio. Requiert TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM.
export class SmsChannel implements NotificationChannel {
  readonly name = 'sms';
  private logger = new Logger('SMS');
  constructor(private sid: string, private token: string, private from: string) {}

  private normalize(phone: string): string {
    let p = phone.replace(/[^0-9]/g, '');
    if (!p.startsWith('224') && p.length === 9) p = '224' + p;
    return '+' + p;
  }

  async send(to: string, titre: string, contenu: string): Promise<SendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`;
    const params = new URLSearchParams({ To: this.normalize(to), From: this.from, Body: `${titre}: ${contenu}` });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${this.sid}:${this.token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const data: any = await res.json();
      if (!res.ok) {
        this.logger.warn(`Échec SMS: ${JSON.stringify(data)}`);
        return { ok: false, error: data?.message ?? 'Erreur SMS' };
      }
      return { ok: true, ref: data?.sid };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Erreur réseau SMS' };
    }
  }
}
