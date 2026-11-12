/**
 * Ciclo de vida completo do disparo de um e-mail
 */
export enum EmailStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

