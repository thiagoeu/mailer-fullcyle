import { HttpStatus } from '../enums/http-status.enum';

/**
 * Classe base para erros operacionais conhecidos da aplicacao.
 * Erros operacionais sao aqueles que esperamos que possam acontecer (ex: e-mail nao encontrado, dados invalidos).
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

