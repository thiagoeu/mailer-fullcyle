import 'dotenv/config';
import { AppDataSource } from '../database/data-source';
import { EmailJob, EmailStatus } from '../database/entities/EmailJob';
import { addEmailToQueue } from '../modules/mailer/queues/email.queue';
import { setupEmailWorker } from '../modules/mailer/workers/email.worker';

async function testQueueFlow() {
  console.log('[INFO] Iniciando teste do fluxo assincrono Fila + Worker + Banco...');

  // 1. Inicializa o TypeORM
  await AppDataSource.initialize();
  console.log('[INFO] Banco de dados conectado.');

  // 2. Inicializa o Worker
  const worker = setupEmailWorker();
  console.log('[INFO] Worker inicializado e escutando a fila no Redis.');

  // 3. Simula a criacao de um e-mail no PostgreSQL
  const emailRepo = AppDataSource.getRepository(EmailJob);
  const targetEmail = process.env.GOOGLE_ACCOUNT_USER || 'contatochecker@gmail.com';

  const newEmail = emailRepo.create({
    to: targetEmail,
    subject: 'Teste Assincrono - BullMQ + Worker + TypeORM',
    body: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
        <h2 style="color: #10B981;">Processamento Assincrono com Sucesso</h2>
        <p>Este e-mail foi processado por um <strong>Worker BullMQ</strong> desacoplado da API.</p>
        <ul>
          <li><strong>ID do Registro:</strong> Salvo no PostgreSQL com TypeORM</li>
          <li><strong>Fila:</strong> Redis (BullMQ)</li>
          <li><strong>Disparo:</strong> Nodemailer (Gmail SMTP)</li>
        </ul>
      </div>
    `,
    status: EmailStatus.PENDING,
  });

  const savedEmail = await emailRepo.save(newEmail);
  console.log(`[INFO] E-mail criado no banco com ID: ${savedEmail.id} (Status: ${savedEmail.status})`);

  // 4. Enfileira o e-mail no Redis via BullMQ
  console.log('[INFO] Adicionando job na fila do Redis...');
  const job = await addEmailToQueue(savedEmail.id);
  console.log(`[INFO] Job #${job.id} enfileirado com sucesso.`);

  // 5. Aguarda processamento do Worker
  console.log('[INFO] Aguardando processamento do Worker...');
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // 6. Consulta o banco novamente para ver a atualizacao de status
  const updatedEmail = await emailRepo.findOne({ where: { id: savedEmail.id } });
  console.log('\n[INFO] Estado final do registro no PostgreSQL:');
  console.log({
    id: updatedEmail?.id,
    status: updatedEmail?.status,
    attempts: updatedEmail?.attempts,
    externalMessageId: updatedEmail?.externalMessageId,
    sentAt: updatedEmail?.sentAt,
  });

  // Finalizacao limpa
  await worker.close();
  await AppDataSource.destroy();
  console.log('\n[INFO] Teste finalizado com sucesso.');
  process.exit(0);
}

testQueueFlow().catch((err) => {
  console.error('[ERROR] Erro no teste:', err);
  process.exit(1);
});
