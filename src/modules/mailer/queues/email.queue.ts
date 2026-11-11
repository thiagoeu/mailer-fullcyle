import { Queue } from 'bullmq';
import { redisConnection } from '../../../config/redis';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface SendEmailJobData {
  emailId: string; // ID do registro criado no PostgreSQL
}

/**
 * Fila BullMQ para processamento de e-mails
 */
export const emailQueue = new Queue<SendEmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // Tenta até 3 vezes se houver falha
    attempts: 3,
    // Backoff exponencial: 1ª retentativa após 5s, 2ª após 10s, etc.
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    // Limpeza automática para economizar memória do Redis
    removeOnComplete: {
      count: 100, // mantém os últimos 100 completados para auditoria
    },
    removeOnFail: {
      count: 500, // mantém os últimos 500 com falha para investigação
    },
  },
});

/**
 * Função utilitária para adicionar um job na fila
 */
export async function addEmailToQueue(emailId: string) {
  return await emailQueue.add(
    'send-email',
    { emailId },
    {
      jobId: emailId, // Garante que o mesmo e-mail nunca seja enfileirado em duplicidade no Redis
    }
  );
}

