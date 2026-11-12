import { z } from 'zod';
import { SendEmailSchema, EmailParamsSchema, EmailResponseSchema } from '../dtos/send-email.dto';
import { HttpStatus } from '../../../shared/enums/http-status.enum';
import { SwaggerConstants } from '../../../shared/constants/swagger.constants';
import { MessagesConstants } from '../../../shared/constants/messages.constants';

/**
 * Schema OpenAPI / Swagger da rota POST /emails/send
 */
export const sendEmailRouteSchema = {
  tags: [SwaggerConstants.TAG_EMAILS],
  summary: 'Enfileira um novo e-mail para processamento assincrono',
  description: 'Recebe o destinatario, assunto e corpo (ou template Handlebars), garantindo idempotencia caso a chave Idempotency-Key seja fornecida. Responde 202 Accepted imediatamente e processa o envio em background via BullMQ.',
  headers: z.object({
    [MessagesConstants.HEADER_IDEMPOTENCY_KEY]: z.string().optional().describe('Chave de idempotencia enviada via header'),
  }),
  body: SendEmailSchema,
  response: {
    [HttpStatus.ACCEPTED]: z.object({
      statusCode: z.number().default(HttpStatus.ACCEPTED),
      message: z.string(),
      email: EmailResponseSchema,
    }).describe('E-mail validado e enfileirado com sucesso'),
    [HttpStatus.OK]: z.object({
      statusCode: z.number().default(HttpStatus.OK),
      message: z.string(),
      email: EmailResponseSchema,
    }).describe('Idempotencia detectada: e-mail previamente registrado retornado'),
    [HttpStatus.BAD_REQUEST]: z.object({
      statusCode: z.number().default(HttpStatus.BAD_REQUEST),
      error: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }).describe('Dados de entrada invalidos'),
  },
};

/**
 * Schema OpenAPI / Swagger da rota GET /emails/:id
 */
export const getEmailByIdRouteSchema = {
  tags: [SwaggerConstants.TAG_EMAILS],
  summary: 'Consulta o status de entrega de um e-mail pelo ID',
  description: 'Retorna os dados completos do disparo, incluindo tentativas realizadas, erros registrados e ID retornado pelo provedor SMTP.',
  params: EmailParamsSchema,
  response: {
    [HttpStatus.OK]: z.object({
      statusCode: z.number().default(HttpStatus.OK),
      email: EmailResponseSchema,
    }).describe('Dados do e-mail encontrados'),
    [HttpStatus.NOT_FOUND]: z.object({
      statusCode: z.number().default(HttpStatus.NOT_FOUND),
      error: z.string(),
      message: z.string(),
      path: z.string().optional(),
      timestamp: z.string().optional(),
    }).describe('E-mail nao localizado na base de dados'),
  },
};
