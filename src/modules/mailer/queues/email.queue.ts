import { Queue } from 'bullmq';
import { redisConnection } from '../../../config/redis';
import { QueueConstants } from '../../../shared/constants/queue.constants';
import { SendEmailJobData } from '../interfaces/send-email-job-data.interface';

export { QueueConstants };
export type { SendEmailJobData };

/**
 * Fila BullMQ para processamento de e-mails
 */
export const emailQueue = new Queue<SendEmailJobData>(QueueConstants.EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: QueueConstants.DEFAULT_MAX_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: QueueConstants.DEFAULT_BACKOFF_DELAY_MS,
    },
    removeOnComplete: {
      count: QueueConstants.REMOVE_ON_COMPLETE_COUNT,
    },
    removeOnFail: {
      count: QueueConstants.REMOVE_ON_FAIL_COUNT,
    },
  },
});

/**
 * Funcao utilitaria para adicionar um job na fila com garantia de jobId unico
 */
export async function addEmailToQueue(emailId: string) {
  return await emailQueue.add(
    QueueConstants.JOB_SEND_EMAIL_NAME,
    { emailId },
    {
      jobId: emailId,
    }
  );
}
