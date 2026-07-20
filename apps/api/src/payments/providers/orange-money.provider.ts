import { Injectable, Logger } from '@nestjs/common';

export interface OmInitResult {
  externalRef: string;
  status: 'INITIATED' | 'SIMULATED';
  paymentUrl?: string;
  payToken?: string;
}

// Connecteur Orange Money Web Payment (Guinée).
// Requiert OM_CLIENT_ID, OM_CLIENT_SECRET, OM_MERCHANT_KEY.
// Sans identifiants -> mode simulé (référence générée, statut SIMULATED).
@Injectable()
export class OrangeMoneyProvider {
  private logger = new Logger('OrangeMoney');
  private base = process.env.OM_BASE_URL ?? 'https://api.orange.com';
  private country = process.env.OM_COUNTRY ?? 'gn';

  private configured(): boolean {
    return !!(process.env.OM_CLIENT_ID && process.env.OM_CLIENT_SECRET && process.env.OM_MERCHANT_KEY);
  }

  private async token(): Promise<string | null> {
    const creds = Buffer.from(`${process.env.OM_CLIENT_ID}:${process.env.OM_CLIENT_SECRET}`).toString('base64');
    try {
      const res = await fetch(`${this.base}/oauth/v3/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      const data: any = await res.json();
      return data?.access_token ?? null;
    } catch (e) {
      this.logger.warn(`Token OM: ${e}`);
      return null;
    }
  }

  async initiate(amount: number, orderRef: string): Promise<OmInitResult> {
    if (!this.configured()) {
      return { externalRef: `OM-SIM-${orderRef}`, status: 'SIMULATED' };
    }
    const token = await this.token();
    if (!token) return { externalRef: `OM-SIM-${orderRef}`, status: 'SIMULATED' };

    const body = {
      merchant_key: process.env.OM_MERCHANT_KEY,
      currency: 'OUV', // sandbox: OUV ; production Guinée : GNF
      order_id: orderRef,
      amount,
      return_url: process.env.OM_RETURN_URL ?? 'https://colisgui.gn/paiement/retour',
      cancel_url: process.env.OM_CANCEL_URL ?? 'https://colisgui.gn/paiement/annule',
      notif_url: process.env.OM_NOTIF_URL ?? 'https://colisgui.gn/api/v1/payments/orange-money/callback',
      lang: 'fr',
    };
    try {
      const res = await fetch(`${this.base}/orange-money-webpay/${this.country}/v1/webpayment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: any = await res.json();
      if (!res.ok) {
        this.logger.warn(`Init OM échoué: ${JSON.stringify(data)}`);
        return { externalRef: `OM-SIM-${orderRef}`, status: 'SIMULATED' };
      }
      return { externalRef: data?.pay_token ?? orderRef, status: 'INITIATED', paymentUrl: data?.payment_url, payToken: data?.pay_token };
    } catch (e) {
      this.logger.warn(`Init OM: ${e}`);
      return { externalRef: `OM-SIM-${orderRef}`, status: 'SIMULATED' };
    }
  }
}
