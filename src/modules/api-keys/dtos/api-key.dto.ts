import { z } from 'zod';

export const CreateApiKeySchema = z.object({
  name: z
    .string({ required_error: 'O nome da aplicacao ou cliente e obrigatorio.' })
    .min(2, 'O nome deve ter no minimo 2 caracteres.')
    .max(150, 'O nome pode ter no maximo 150 caracteres.')
    .default('Meu Backend de E-commerce')
    .describe('Nome descritivo da aplicacao que usara esta chave'),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

export const ApiKeyParamsSchema = z.object({
  id: z.string().uuid('O parametro ID deve ser um UUID valido.').describe('Identificador unico da chave de API'),
});

export const ApiKeyItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  keyPrefix: z.string(),
  isActive: z.boolean(),
  lastUsedAt: z.union([z.string(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const CreatedApiKeyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  keyPrefix: z.string(),
  apiKey: z.string().describe('Chave completa em texto puro exibida APENAS UMA VEZ'),
  isActive: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
});
