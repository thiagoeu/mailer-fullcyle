import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { EmailController } from '../controllers/email.controller';
import { SendEmailSchema, EmailParamsSchema, EmailResponseSchema } from '../dtos/send-email.dto';
import { z } from 'zod';

export async function emailRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  const controller = new EmailController();

  // Enfileira um novo e-mail
  typedApp.post(
    '/send',
    {
      schema: {
        tags: ['Emails'],
        summary: 'Enfileira um novo e-mail para processamento assincrono',
        description: 'Recebe o destinatario, assunto e corpo, garantindo idempotencia caso a chave Idempotency-Key seja fornecida. Responde 202 Accepted imediatamente e processa o envio em background via BullMQ.',
        headers: z.object({
          'idempotency-key': z.string().optional().describe('Chave de idempotencia enviada via header'),
        }),
        body: SendEmailSchema,
        response: {
          202: z.object({
            statusCode: z.number().default(202),
            message: z.string(),
            email: EmailResponseSchema,
          }).describe('E-mail validado e enfileirado com sucesso'),
          200: z.object({
            statusCode: z.number().default(200),
            message: z.string(),
            email: EmailResponseSchema,
          }).describe('Idempotencia detectada: e-mail previamente registrado retornado'),
          400: z.object({
            statusCode: z.number().default(400),
            error: z.string(),
            message: z.string(),
            details: z.any().optional(),
          }).describe('Dados de entrada invalidos'),
        },
      },
    },
    controller.send.bind(controller)
  );

  // Consulta o status de um e-mail pelo ID
  typedApp.get(
    '/:id',
    {
      schema: {
        tags: ['Emails'],
        summary: 'Consulta o status de entrega de um e-mail pelo ID',
        description: 'Retorna os dados completos do disparo, incluindo tentativas realizadas, erros registrados e ID retornado pelo provedor SMTP.',
        params: EmailParamsSchema,
        response: {
          200: z.object({
            statusCode: z.number().default(200),
            email: EmailResponseSchema,
          }).describe('Dados do e-mail encontrados'),
          404: z.object({
            statusCode: z.number().default(404),
            error: z.string(),
            message: z.string(),
          }).describe('E-mail nao encontrado'),
        },
      },
    },
    controller.getById.bind(controller)
  );
}
