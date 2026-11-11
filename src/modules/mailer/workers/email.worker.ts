import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../../config/redis';
import { EMAIL_QUEUE_NAME, SendEmailJobData } from '../queues/email.queue';
import { AppDataSource } from '../../../database/data-source';
import { EmailJob, EmailStatus } from '../../../database/entities/EmailJob';
import { createMailTransporter, mailConfig } from '../../../config/mail';
import { emailsTotalCounter, emailSendDurationHistogram } from '../../../shared/metrics';

const transporter = createMailTransporter();

export function setupEmailWorker(): Worker<SendEmailJobData> {
  const worker = new Worker<SendEmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<SendEmailJobData>) => {
      const { emailId } = job.data;
      console.log(`[Worker] 🔄 Processando Job #${job.id} (Email ID: ${emailId})...`);

      const emailRepository = AppDataSource.getRepository(EmailJob);

      // 1. Busca o registro no PostgreSQL
      const emailRecord = await emailRepository.findOne({ where: { id: emailId } });
      if (!emailRecord) {
        console.error(`[Worker] ❌ Registro de e-mail ${emailId} não encontrado no banco de dados!`);
        throw new Error(`Email com ID ${emailId} não existe.`);
      }

      // Se já foi enviado anteriormente, não reenvia (idempotência defensiva)
      if (emailRecord.status === EmailStatus.SENT) {
        console.log(`[Worker] ⚠️ E-mail ${emailId} já se encontra marcado como SENT. Ignorando.`);
        return;
      }

      // 2. Atualiza status para PROCESSING e incrementa tentativas
      emailRecord.status = EmailStatus.PROCESSING;
      emailRecord.attempts += 1;
      await emailRepository.save(emailRecord);

      // Inicia timer para registrar a latência do envio nas métricas
      const stopTimer = emailSendDurationHistogram.startTimer({
        provider: mailConfig.provider,
      });

      try {
        // 3. Executa o disparo via SMTP (Google / Mailpit)
        const info = await transporter.sendMail({
          from: emailRecord.from || `"Mailer Service" <${mailConfig.fromDefault}>`,
          to: emailRecord.to,
          subject: emailRecord.subject,
          html: emailRecord.body,
        });

        // Para o timer marcando sucesso
        stopTimer({ success: 'true' });

        // Incrementa métrica de e-mails enviados com sucesso
        emailsTotalCounter.inc({ status: 'sent', provider: mailConfig.provider });

        // 4. Marca como SENT e salva o ID retornado pelo SMTP
        emailRecord.status = EmailStatus.SENT;
        emailRecord.sentAt = new Date();
        emailRecord.externalMessageId = info.messageId;
        emailRecord.lastError = undefined;
        await emailRepository.save(emailRecord);

        console.log(`[Worker] ✅ E-mail ${emailId} enviado com sucesso! Message-ID: ${info.messageId}`);
      } catch (error: any) {
        // Para o timer marcando falha
        stopTimer({ success: 'false' });

        // Incrementa métrica de falha
        emailsTotalCounter.inc({ status: 'failed', provider: mailConfig.provider });

        console.error(`[Worker] ❌ Falha no envio do e-mail ${emailId}:`, error.message);

        emailRecord.lastError = error.message;

        // Se for a última tentativa permitida pelo BullMQ, marca como FAILED definitivamente
        const maxAttempts = job.opts.attempts || 3;
        if (emailRecord.attempts >= maxAttempts) {
          emailRecord.status = EmailStatus.FAILED;
        }

        await emailRepository.save(emailRecord);

        // Relança o erro para o BullMQ reagendar a retentativa com Backoff
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Processa até 5 e-mails em paralelo
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker Event] 🎉 Job #${job.id} finalizado com sucesso!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`[Worker Event] ⚠️ Job #${job?.id} falhou. Tentativa ${job?.attemptsMade}/${job?.opts.attempts}. Erro: ${err.message}`);
  });

  return worker;
}
