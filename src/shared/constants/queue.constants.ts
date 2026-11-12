/**
 * Constantes de configuracao das filas assincronas BullMQ e Redis
 */
export const QueueConstants = {
  EMAIL_QUEUE_NAME: 'email-queue',
  JOB_SEND_EMAIL_NAME: 'send-email',
  
  // Politica de Resiliencia e Retry
  DEFAULT_MAX_ATTEMPTS: 3,
  DEFAULT_BACKOFF_DELAY_MS: 5000,
  
  // Concorrencia de processamento simultaneo no Worker
  WORKER_CONCURRENCY: 5,
  
  // Limpeza de memoria no Redis
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 500,
} as const;

