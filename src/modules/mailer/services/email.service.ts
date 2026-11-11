import { AppDataSource } from '../../../database/data-source';
import { EmailJob, EmailStatus } from '../../../database/entities/EmailJob';
import { SendEmailInput } from '../dtos/send-email.dto';
import { addEmailToQueue } from '../queues/email.queue';
import { emailsTotalCounter } from '../../../shared/metrics';
import { mailConfig } from '../../../config/mail';

export class EmailService {
  private emailRepository = AppDataSource.getRepository(EmailJob);

  /**
   * Processa o enfileiramento de um e-mail com garantia de idempotência
   */
  async enqueueEmail(data: SendEmailInput): Promise<{ email: EmailJob; alreadyExists: boolean }> {
    // 1. Verificação de Idempotência
    if (data.idempotencyKey) {
      const existingEmail = await this.emailRepository.findOne({
        where: { idempotencyKey: data.idempotencyKey },
      });

      if (existingEmail) {
        // Já existe um e-mail com esta chave; retornamos o original sem duplicar
        return {
          email: existingEmail,
          alreadyExists: true,
        };
      }
    }

    // 2. Criação do registro inicial no PostgreSQL com status PENDING
    const newEmail = this.emailRepository.create({
      to: data.to,
      from: data.from,
      subject: data.subject,
      body: data.body,
      idempotencyKey: data.idempotencyKey,
      metadata: data.metadata,
      status: EmailStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
    });

    const savedEmail = await this.emailRepository.save(newEmail);

    // 3. Adiciona na fila do BullMQ (Redis) para o Worker consumir
    await addEmailToQueue(savedEmail.id);

    // 4. Registra métrica de e-mail enfileirado
    emailsTotalCounter.inc({ status: 'queued', provider: mailConfig.provider });

    return {
      email: savedEmail,
      alreadyExists: false,
    };
  }

  /**
   * Consulta o status atual de um e-mail pelo seu ID
   */
  async getEmailById(id: string): Promise<EmailJob | null> {
    return await this.emailRepository.findOne({
      where: { id },
    });
  }
}
