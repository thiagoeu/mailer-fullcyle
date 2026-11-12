import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error';
import { HttpStatus } from '../enums/http-status.enum';

interface FormattedValidationError {
  field: string;
  message: string;
}

/**
 * Manipulador global de erros e excecoes da API Fastify.
 * Centraliza a captura de falhas de validacao, erros operacionais e falhas inesperadas.
 */
export function globalErrorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const timestamp = new Date().toISOString();
  const path = request.url;

  // 1. Tratamento para erros de validacao nativos do Zod
  if (error instanceof ZodError) {
    const formattedErrors: FormattedValidationError[] = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return reply.status(HttpStatus.BAD_REQUEST).send({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Falha na validacao dos dados de entrada.',
      details: formattedErrors,
      timestamp,
      path,
    });
  }

  // 2. Tratamento para erros de validacao de schema do Fastify
  if ((error as any).validation) {
    const validationDetails = (error as any).validation;
    const formattedErrors: FormattedValidationError[] = Array.isArray(validationDetails)
      ? validationDetails.map((v: any) => ({
          field: v.instancePath ? v.instancePath.replace(/^\//, '') : v.params?.issue?.path?.join('.') || 'parametro',
          message: v.message || 'Dado invalido.',
        }))
      : [{ field: 'request', message: error.message }];

    return reply.status(HttpStatus.BAD_REQUEST).send({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Falha na validacao dos dados de entrada.',
      details: formattedErrors,
      timestamp,
      path,
    });
  }

  // 3. Tratamento para erros operacionais conhecidos (AppError, NotFoundError, etc.)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      timestamp,
      path,
    });
  }

  // 4. Tratamento para falhas inesperadas (Bugs, quedas de banco, 500)
  request.log.error(error, `[ERROR] Erro interno nao tratado na rota ${path}: ${error.message}`);

  return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'Internal Server Error',
    message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
    timestamp,
    path,
  });
}

