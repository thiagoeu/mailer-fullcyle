import { z } from 'zod';

/**
 * Schema de validacao para a requisicao de envio de e-mail.
 * O Zod garante validacao estrita em runtime e tipagem estatica no TypeScript.
 */
export const SendEmailSchema = z.object({
  to: z
    .string({ required_error: 'O destinatario (to) e obrigatorio.' })
    .email('Formato de e-mail invalido.')
    .describe('Endereco de e-mail do destinatario'),
  from: z
    .string()
    .email('Formato de e-mail de remetente invalido.')
    .optional()
    .describe('Remetente personalizado (opcional, padrao e a conta configurada)'),
  subject: z
    .string({ required_error: 'O assunto (subject) e obrigatorio.' })
    .min(1, 'O assunto nao pode estar vazio.')
    .max(255, 'O assunto pode ter no maximo 255 caracteres.')
    .describe('Assunto do e-mail'),
  body: z
    .string({ required_error: 'O corpo do e-mail (body) e obrigatorio.' })
    .min(1, 'O corpo do e-mail nao pode estar vazio.')
    .describe('Conteudo HTML ou texto do e-mail'),
  idempotencyKey: z
    .string()
    .max(120, 'A chave de idempotencia pode ter no maximo 120 caracteres.')
    .optional()
    .describe('Chave unica de idempotencia para evitar disparos duplicados'),
  metadata: z
    .record(z.any())
    .optional()
    .describe('Metadados extras em formato JSON'),
});

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

export const EmailParamsSchema = z.object({
  id: z.string().uuid('O parametro ID deve ser um UUID valido.').describe('Identificador unico do e-mail'),
});

export const EmailResponseSchema = z.object({
  id: z.string().uuid(),
  idempotencyKey: z.string().nullable().optional(),
  to: z.string().email(),
  from: z.string().nullable().optional(),
  subject: z.string(),
  body: z.string(),
  status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED']),
  attempts: z.number(),
  maxAttempts: z.number(),
  lastError: z.string().nullable().optional(),
  externalMessageId: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  sentAt: z.date().or(z.string()).nullable().optional(),
});
