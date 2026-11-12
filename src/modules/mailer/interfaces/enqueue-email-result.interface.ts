import { EmailJob } from '../../../database/entities/EmailJob';

/**
 * Contrato de retorno da operacao de enfileiramento de e-mail
 */
export interface EnqueueEmailResult {
  email: EmailJob;
  alreadyExists: boolean;
}

