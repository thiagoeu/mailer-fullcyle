import { z } from 'zod';

/**
 * Schema de validacao para a requisicao de envio de e-mail.
 * Permite tanto o envio de corpo direto (body) quanto o uso de template Handlebars compilado.
 * Inclui exemplos padroes prontos para facilitar o teste no Swagger UI.
 */
export const SendEmailSchema = z
  .object({
    to: z
      .string({ required_error: 'O destinatario (to) e obrigatorio.' })
      .email('Formato de e-mail invalido.')
      .default('contatochecker@gmail.com')
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
      .default('Bem-vindo ao Mailer Service!')
      .describe('Assunto do e-mail'),
    body: z
      .string()
      .min(1, 'O corpo do e-mail nao pode estar vazio.')
      .optional()
      .describe('Conteudo HTML ou texto do e-mail (obrigatorio se nao informar template)'),
    template: z
      .string()
      .min(1, 'O nome do template nao pode estar vazio.')
      .default('welcome')
      .optional()
      .describe('Nome do template Handlebars: "welcome", "password-reset", "order-confirmation" ou "security-alert"'),
    templateVariables: z
      .record(z.any())
      .default({
        name: 'Desenvolvedor Full Cycle',
        actionUrl: 'https://github.com/thiagoeu/mailer-fullcyle',
      })
      .optional()
      .describe('Variaveis dinamicas injetadas no template'),
    idempotencyKey: z
      .string()
      .max(120, 'A chave de idempotencia pode ter no maximo 120 caracteres.')
      .optional()
      .describe('Chave unica de idempotencia para evitar disparos duplicados'),
    metadata: z
      .record(z.any())
      .optional()
      .describe('Metadados extras em formato JSON'),
  })
  .refine((data) => data.body || data.template, {
    message: 'E necessario fornecer o corpo do e-mail (body) ou o nome de um template (template).',
    path: ['body'],
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
  sentAt: z.date().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EmailResponse = z.infer<typeof EmailResponseSchema>;
