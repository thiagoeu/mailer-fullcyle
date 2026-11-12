import { AppError } from './app-error';
import { HttpStatus } from '../enums/http-status.enum';

/**
 * Erro disparado quando o header x-api-key e invalido ou ausente.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Acesso nao autorizado. Header "x-api-key" ausente ou invalido.') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

