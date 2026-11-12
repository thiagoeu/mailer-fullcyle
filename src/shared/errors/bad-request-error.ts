import { HttpStatus } from '../enums/http-status.enum';
import { AppError } from './app-error';

export class BadRequestError extends AppError {
  constructor(message: string = 'Requisicao invalida.', details?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, details);
  }
}

