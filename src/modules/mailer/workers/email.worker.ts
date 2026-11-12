import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../../config/redis';
import { QueueConstants } from '../../../shared/constants/queue.constants';
import { SendEmailJobData } from '../interfaces/send-email-job-data.interface';
import { AppDataSource } from '../../../database/data-source';
import { EmailJob } from '../../../database/entities/EmailJob';
import { EmailStatus } from '../../../shared/enums/email-status.enum';
import { createMailTransporter, mailConfig } from '../../../config/mail';
import { emailsTotalCounter, emailSendDurationHistogram } from '../../../shared/metrics';
import { TemplateService } from '../services/template.service';

const transporter = createMailTransporter();
const templateService = TemplateService.getInstance();

export function setupEmailWorker(): Worker<SendEmailJobData> {
  const worker = new Worker<SendEmailJobData>(
    QueueConstants.EMAIL_QUEUE_NAME,
    async (job: Job<SendEmailJobData>) => {
      const { emailId } = job.data;
      console.log(`[Worker] Processando Job #${job.id} (Email ID: ${emailId})...`);

      const emailRepository = AppDataSource.getRepository(EmailJob);

      // 1. Busca o registro no PostgreSQL
      const emailRecord = await emailRepository.findOne({ where: { id: emailId } });
      if (!emailRecord) {
        console.error(`[Worker] [ERROR] Registro de e-mail ${emailId} nao encontrado no banco de dados.`);
        throw new Error(`Email com ID ${emailId} nao existe.`);
      }

      // Se ja foi enviado anteriormente, nao reenvia (idempotencia defensiva)
      if (emailRecord.status === EmailStatus.SENT) {
        console.log(`[Worker] [WARN] E-mail ${emailId} ja se encontra marcado como SENT. Ignorando.`);
        return;
      }

      // 2. Atualiza status para PROCESSING e incrementa tentativas
      emailRecord.status = EmailStatus.PROCESSING;
      emailRecord.attempts += 1;
      await emailRepository.save(emailRecord);

      // Inicia timer para registrar a latencia do envio nas metricas
      const stopTimer = emailSendDurationHistogram.startTimer({
        provider: mailConfig.provider,
      });

      try {
        // 3. Renderiza o corpo do e-mail (se usar template Handlebars)
        let htmlBody = emailRecord.body;
        const templateName = emailRecord.metadata?.template;
        const templateVariables = emailRecord.metadata?.templateVariables || {};

        if (templateName) {
          htmlBody = await templateService.render(templateName, templateVariables);
          // Atualiza o corpo renderizado no registro do banco para fins de auditoria
          emailRecord.body = htmlBody;
        }

        // 4. Executa o disparo via SMTP (Google / Mailpit)
        const info = await transporter.sendMail({
          from: emailRecord.from || `"Mailer Service" <${mailConfig.fromDefault}>`,
          to: emailRecord.to,
          subject: emailRecord.subject,
          html: htmlBody,
        });

        // Para o timer marcando sucesso
        stopTimer({ success: 'true' });

        // Incrementa metrica de e-mails enviados com sucesso
        emailsTotalCounter.inc({ status: 'sent', provider: mailConfig.provider });

        // 5. Marca como SENT e salva o ID retornado pelo SMTP
        emailRecord.status = EmailStatus.SENT;
        emailRecord.sentAt = new Date();
        emailRecord.externalMessageId = info.messageId;
        emailRecord.lastError = undefined;
        await emailRepository.save(emailRecord);

        console.log(`[Worker] [INFO] E-mail ${emailId} enviado com sucesso. Message-ID: ${info.messageId}`);
      } catch (error: any) {
        // Para o timer marcando falha
        stopTimer({ success: 'false' });

        // Incrementa metrica de falha
        emailsTotalCounter.inc({ status: 'failed', provider: mailConfig.provider });

        emailRecord.lastError = error.message || 'Erro desconhecido durante o disparo.';

        // Se atingiu o limite maximo de tentativas, marca como FAILED definitivo
        if (emailRecord.attempts >= emailRecord.maxAttempts) {
          emailRecord.status = EmailStatus.FAILED;
          console.error(
            `[Worker] [FATAL] E-mail ${emailId} falhou apos atingir ${emailRecord.attempts} tentativas. Erro: ${error.message}`
          );
        } else {
          // Mantem como PENDING para a proxima retentativa com backoff do BullMQ
          emailRecord.status = EmailStatus.PENDING;
          console.warn(
            `[Worker] [WARN] Falha temporaria ao enviar e-mail ${emailId} (Tentativa ${emailRecord.attempts}/${emailRecord.maxAttempts}). Reenfileirando...`
          );
        }

        await emailRepository.save(emailRecord);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job #${job?.id} falhou: ${err.message}`);
  });

  return worker;
}
