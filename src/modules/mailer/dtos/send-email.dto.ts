import { z } from 'zod';

/**
 * Schema de validação para a requisição de envio de e-mail.
 * O Zod garante validação estrita em runtime e tipagem estática no TypeScript.
 */
export const SendEmailSchema = z.object({
  to: z
    .string({ required_error: 'O destinatário (to) é obrigatório.' })
    .email('Formato de e-mail inválido.'),
  from: z
    .string()
    .email('Formato de e-mail de remetente inválido.')
    .optional(),
  subject: z
    .string({ required_error: 'O assunto (subject) é obrigatório.' })
    .min(1, 'O assunto não pode estar vazio.')
    .max(255, 'O assunto pode ter no máximo 255 caracteres.'),
  body: z
    .string({ required_error: 'O corpo do e-mail (body) é obrigatório.' })
    .min(1, 'O corpo do e-mail não pode estar vazio.'),
  idempotencyKey: z
    .string()
    .max(120, 'A chave de idempotência pode ter no máximo 120 caracteres.')
    .optional(),
  metadata: z
    .record(z.any())
    .optional(),
});

// Inferência de tipo TypeScript nativa a partir do schema Zod
export type SendEmailInput = z.infer<typeof SendEmailSchema>;

