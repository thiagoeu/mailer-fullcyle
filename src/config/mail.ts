import 'dotenv/config';
import nodemailer, { Transporter } from 'nodemailer';
import { MailProvider } from '../shared/enums/mail-provider.enum';

export interface MailConfig {
  provider: MailProvider;
  fromDefault: string;
}

export const mailConfig: MailConfig = {
  provider: (process.env.MAIL_PROVIDER as MailProvider) || MailProvider.GMAIL,
  fromDefault: process.env.EMAIL_FROM_DEFAULT || 'contatochecker@gmail.com',
};

/**
 * Cria o transporte SMTP configurado de acordo com o ambiente (Gmail ou Mailpit)
 */
export function createMailTransporter(): Transporter {
  if (mailConfig.provider === MailProvider.GMAIL) {
    const pass = (process.env.GOOGLE_ACCOUNT_PASSWORD || '').replace(/\s+/g, '');

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GOOGLE_ACCOUNT_USER,
        pass: pass,
      },
    });
  }

  // Fallback: Mailpit local rodando no Docker
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: false,
    ignoreTLS: true,
  });
}
