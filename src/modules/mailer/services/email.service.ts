import { AppDataSource } from '../../../database/data-source';
import { EmailJob } from '../../../database/entities/EmailJob';
import { EmailStatus } from '../../../shared/enums/email-status.enum';
import { QueueConstants } from '../../../shared/constants/queue.constants';
import { MessagesConstants } from '../../../shared/constants/messages.constants';
import { SendEmailInput } from '../dtos/send-email.dto';
import { addEmailToQueue } from '../queues/email.queue';
import { emailsTotalCounter } from '../../../shared/metrics';
import { mailConfig } from '../../../config/mail';
import { EnqueueEmailResult } from '../interfaces/enqueue-email-result.interface';
import { NotFoundError } from '../../../shared/errors/not-found-error';

export class EmailService {
  private emailRepository = AppDataSource.getRepository(EmailJob);

  /**
   * Processa o enfileiramento de um e-mail com garantia de idempotencia
   */
  async enqueueEmail(data: SendEmailInput): Promise<EnqueueEmailResult> {
    // 1. Verificacao de Idempotencia
    if (data.idempotencyKey) {
      const existingEmail = await this.emailRepository.findOne({
        where: { idempotencyKey: data.idempotencyKey },
      });

      if (existingEmail) {
        return {
          email: existingEmail,
          alreadyExists: true,
        };
      }
    }

    // 2. Prepara os metadados incluindo informacoes de template se houver
    const metadata = {
      ...(data.metadata || {}),
      ...(data.template ? { template: data.template, templateVariables: data.templateVariables || {} } : {}),
    };

    // 3. Criacao do registro inicial no PostgreSQL com status PENDING
    const newEmail = this.emailRepository.create({
      to: data.to,
      from: data.from,
      subject: data.subject,
      body: data.body || '', // Sera populado pelo worker se for baseado em template
      idempotencyKey: data.idempotencyKey,
      metadata,
      status: EmailStatus.PENDING,
      attempts: 0,
      maxAttempts: QueueConstants.DEFAULT_MAX_ATTEMPTS,
    });

    const savedEmail = await this.emailRepository.save(newEmail);

    // 4. Adiciona na fila do BullMQ (Redis) para o Worker consumir
    await addEmailToQueue(savedEmail.id);

    // 5. Registra metrica de e-mail enfileirado
    emailsTotalCounter.inc({ status: 'queued', provider: mailConfig.provider });

    return {
      email: savedEmail,
      alreadyExists: false,
    };
  }

  /**
   * Busca um e-mail persistido por ID com tratamento centralizado de erro
   */
  async getEmailById(id: string): Promise<EmailJob> {
    const email = await this.emailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundError(MessagesConstants.EMAIL_NOT_FOUND);
    }

    return email;
  }
}
