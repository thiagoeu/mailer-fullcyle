import { HttpStatus } from '../enums/http-status.enum';
import { AppError } from './app-error';

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso nao encontrado.') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

