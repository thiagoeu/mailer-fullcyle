import 'dotenv/config';
import { AppDataSource } from '../database/data-source';
import { setupEmailWorker } from '../modules/mailer/workers/email.worker';
import { EmailService } from '../modules/mailer/services/email.service';
import { emailQueue } from '../modules/mailer/queues/email.queue';
import { EmailStatus } from '../shared/enums/email-status.enum';

async function runTemplateTest() {
  console.log('--- TESTE: RENDERIZACAO DE TEMPLATE HANDLEBARS E DISPARO ---');

  // 1. Inicializa o DataSource
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  console.log('[1/4] Banco de dados conectado.');

  // 2. Inicia o Worker
  const worker = setupEmailWorker();
  console.log('[2/4] Worker ativo para processar a fila.');

  // 3. Enfileira e-mail com template "welcome"
  const emailService = new EmailService();
  const testRecipient = process.env.GMAIL_USER || 'mailer.test@exemplo.com';
  const idempotencyKey = `test-template-${Date.now()}`;

  console.log(`[3/4] Enfileirando e-mail com template "welcome" para ${testRecipient}...`);
  const result = await emailService.enqueueEmail({
    to: testRecipient,
    subject: 'Teste de Template Handlebars — Mailer Service',
    template: 'welcome',
    templateVariables: {
      name: 'Desenvolvedor Full Cycle',
      actionUrl: 'https://github.com/thiagoeu/mailer-fullcyle',
    },
    idempotencyKey,
  });

  console.log(`Job enfileirado com sucesso. Email ID: ${result.email.id}`);

  // 4. Aguarda o processamento do Worker
  console.log('[4/4] Aguardando processamento e renderizacao do template pelo worker...');
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;

    const updatedEmail = await emailService.getEmailById(result.email.id);

    if (updatedEmail.status === EmailStatus.SENT) {
      console.log('--- SUCESSO: E-MAIL COM TEMPLATE ENVIADO ---');
      console.log(`ID: ${updatedEmail.id}`);
      console.log(`Status: ${updatedEmail.status}`);
      console.log(`Message-ID: ${updatedEmail.externalMessageId}`);
      console.log(`Tentativas: ${updatedEmail.attempts}`);
      console.log('Trecho do HTML renderizado:');
      console.log(updatedEmail.body.slice(0, 300) + '...');

      // Verifica se a variavel foi substituida com sucesso no HTML
      if (updatedEmail.body.includes('Desenvolvedor Full Cycle')) {
        console.log('Validacao de template: Variavel {{name}} injetada com sucesso no HTML.');
      } else {
        console.error('Falha: A variavel {{name}} nao foi encontrada no HTML renderizado.');
        process.exit(1);
      }

      await worker.close();
      await emailQueue.close();
      await AppDataSource.destroy();
      process.exit(0);
    }

    if (updatedEmail.status === EmailStatus.FAILED) {
      console.error(`Falha: E-mail marcado como FAILED. Erro: ${updatedEmail.lastError}`);
      await worker.close();
      await emailQueue.close();
      await AppDataSource.destroy();
      process.exit(1);
    }
  }

  console.error('Timeout: O worker nao concluiu o envio no tempo esperado.');
  await worker.close();
  await emailQueue.close();
  await AppDataSource.destroy();
  process.exit(1);
}

runTemplateTest().catch((error) => {
  console.error('Erro inesperado no teste de template:', error);
  process.exit(1);
});

