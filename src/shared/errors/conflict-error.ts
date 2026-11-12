import { HttpStatus } from '../enums/http-status.enum';
import { AppError } from './app-error';

export class ConflictError extends AppError {
  constructor(message: string = 'Conflito de dados detectado.') {
    super(message, HttpStatus.BAD_REQUEST); // ou 409
  }
}

