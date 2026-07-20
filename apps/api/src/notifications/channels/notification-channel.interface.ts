export interface SendResult {
  ok: boolean;
  ref?: string;
  error?: string;
}

export interface NotificationChannel {
  readonly name: string;
  send(to: string, titre: string, contenu: string): Promise<SendResult>;
}
