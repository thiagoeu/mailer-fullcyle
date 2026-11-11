import 'dotenv/config';
import nodemailer, { Transporter } from 'nodemailer';

export interface MailConfig {
  provider: 'gmail' | 'mailpit';
  fromDefault: string;
}

export const mailConfig: MailConfig = {
  provider: (process.env.MAIL_PROVIDER as 'gmail' | 'mailpit') || 'gmail',
  fromDefault: process.env.EMAIL_FROM_DEFAULT || 'contatochecker@gmail.com',
};

/**
 * Cria o transporte SMTP configurado de acordo com o ambiente (Gmail ou Mailpit)
 */
export function createMailTransporter(): Transporter {
  if (mailConfig.provider === 'gmail') {
    // Para Gmail com Senha de Aplicativo (App Password)
    // Removemos eventuais espaços na senha por segurança
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

