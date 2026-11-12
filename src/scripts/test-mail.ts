import 'dotenv/config';
import { createMailTransporter, mailConfig } from '../config/mail';

async function testMail() {
  console.log(`[INFO] Provedor selecionado: ${mailConfig.provider.toUpperCase()}`);
  const transporter = createMailTransporter();

  try {
    console.log('[INFO] Verificando conexao e autenticacao com o servidor SMTP...');
    await transporter.verify();
    console.log('[INFO] Autenticacao com o servidor SMTP validada com sucesso.');

    const targetEmail = process.env.GOOGLE_ACCOUNT_USER || 'contatochecker@gmail.com';

    console.log(`[INFO] Enviando e-mail de teste para: ${targetEmail}...`);
    const info = await transporter.sendMail({
      from: `"Mailer Full Cycle" <${mailConfig.fromDefault}>`,
      to: targetEmail,
      subject: 'Teste de Inicializacao - Mailer Service Full Cycle',
      text: 'Ola! Se voce recebeu este e-mail, as credenciais e a factory do Nodemailer estao funcionais.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #4F46E5;">Mailer Service — Teste de Envio</h2>
          <p>Ola! Este e um e-mail de teste disparado pelo projeto <strong>Mailer Full Cycle</strong>.</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Provedor:</strong> ${mailConfig.provider}</p>
            <p style="margin: 0;"><strong>Status da Conexao:</strong> Autenticada com sucesso</p>
            <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          <p style="color: #6B7280; font-size: 12px;">Disparado via Node.js + TypeScript + Nodemailer.</p>
        </div>
      `,
    });

    console.log('[INFO] E-mail enviado com sucesso.');
    console.log(`[INFO] ID da Mensagem retornado pelo Google: ${info.messageId}`);
  } catch (error) {
    console.error('[ERROR] Falha ao enviar o e-mail:', error);
    process.exit(1);
  }
}

testMail();
