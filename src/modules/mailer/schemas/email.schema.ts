import { z } from 'zod';
import { SendEmailSchema, EmailParamsSchema, EmailResponseSchema } from '../dtos/send-email.dto';
import { HttpStatus } from '../../../shared/enums/http-status.enum';
import { SwaggerConstants } from '../../../shared/constants/swagger.constants';
import { MessagesConstants } from '../../../shared/constants/messages.constants';

const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

/**
 * Schema OpenAPI / Swagger da rota POST /emails/send
 */
export const sendEmailRouteSchema = {
  tags: [SwaggerConstants.TAG_EMAILS],
  summary: 'Enfileira um novo e-mail para processamento assincrono (Requer API Key)',
  description: 'Recebe o destinatario, assunto e corpo (ou template Handlebars do catalogo: welcome, password-reset, order-confirmation, security-alert), garantindo idempotencia caso o header Idempotency-Key seja fornecido. Responde 202 Accepted imediatamente e despacha em background via BullMQ.',
  security: [{ ApiKeyAuth: [] }],
  headers: z.object({
    'x-api-key': z.string().optional().describe('Chave secreta de autenticacao do servico (padrao: default_secret_key)'),
    [MessagesConstants.HEADER_IDEMPOTENCY_KEY]: z.string().optional().describe('Chave unica de idempotencia para prevencao de disparos duplicados'),
  }),
  body: SendEmailSchema,
  response: {
    [HttpStatus.ACCEPTED]: z.object({
      statusCode: z.number().default(HttpStatus.ACCEPTED),
      message: z.string(),
      email: EmailResponseSchema,
    }).describe('E-mail validado e enfileirado com sucesso para envio assincrono'),
    [HttpStatus.OK]: z.object({
      statusCode: z.number().default(HttpStatus.OK),
      message: z.string(),
      email: EmailResponseSchema,
    }).describe('Idempotencia detectada: e-mail previamente registrado retornado'),
    [HttpStatus.BAD_REQUEST]: ErrorResponseSchema.describe('Falha de validacao no schema ou campos obrigatorios ausentes'),
    [HttpStatus.UNAUTHORIZED]: ErrorResponseSchema.describe('Acesso nao autorizado: header x-api-key ausente ou invalido'),
    [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorResponseSchema.describe('Erro interno nao tratado no servidor'),
  },
};

/**
 * Schema OpenAPI / Swagger da rota GET /emails/:id
 */
export const getEmailByIdRouteSchema = {
  tags: [SwaggerConstants.TAG_EMAILS],
  summary: 'Consulta o status de entrega de um e-mail pelo ID (Requer API Key)',
  description: 'Retorna os dados completos do disparo, incluindo tentativas realizadas, erros registrados e ID retornado pelo provedor SMTP.',
  security: [{ ApiKeyAuth: [] }],
  headers: z.object({
    'x-api-key': z.string().optional().describe('Chave secreta de autenticacao do servico (padrao: default_secret_key)'),
  }),
  params: EmailParamsSchema,
  response: {
    [HttpStatus.OK]: z.object({
      statusCode: z.number().default(HttpStatus.OK),
      email: EmailResponseSchema,
    }).describe('Dados do e-mail encontrados'),
    [HttpStatus.BAD_REQUEST]: ErrorResponseSchema.describe('Parametro ID fornecido nao e um UUID valido'),
    [HttpStatus.UNAUTHORIZED]: ErrorResponseSchema.describe('Acesso nao autorizado: header x-api-key ausente ou invalido'),
    [HttpStatus.NOT_FOUND]: ErrorResponseSchema.describe('E-mail nao localizado na base de dados'),
    [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorResponseSchema.describe('Erro interno nao tratado no servidor'),
  },
};
