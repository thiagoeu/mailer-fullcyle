import { z } from 'zod';
import {
  CreateApiKeySchema,
  ApiKeyParamsSchema,
  ApiKeyItemSchema,
  CreatedApiKeyResponseSchema,
} from '../dtos/api-key.dto';
import { HttpStatus } from '../../../shared/enums/http-status.enum';

const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

export const createApiKeyRouteSchema = {
  tags: ['API Keys'],
  summary: 'Gera uma nova chave de API criptografica (Requer Master Key)',
  description: 'Gera uma chave aleatoria com prefixo mls_live_, armazena apenas o hash SHA-256 no banco e retorna o segredo em texto puro uma unica vez.',
  security: [{ AdminKeyAuth: [] }],
  headers: z.object({
    'x-admin-key': z.string().optional().describe('Chave mestre de administracao do sistema (padrao: master_admin_secret)'),
  }),
  body: CreateApiKeySchema,
  response: {
    [HttpStatus.OK]: z.object({
      statusCode: z.number().default(HttpStatus.OK),
      message: z.string(),
      data: CreatedApiKeyResponseSchema,
    }).describe('Chave gerada com sucesso. Salve o valor de apiKey em local seguro.'),
    [HttpStatus.BAD_REQUEST]: ErrorResponseSchema.describe('Dados de entrada invalidos'),
    [HttpStatus.UNAUTHORIZED]: ErrorResponseSchema.describe('Acesso negado: header x-admin-key ausente ou invalido'),
    [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorResponseSchema.describe('Erro interno no servidor'),
  },
};

export const listApiKeysRouteSchema = {
  tags: ['API Keys'],
  summary: 'Lista as chaves de API cadastradas (Requer Master Key)',
  description: 'Retorna a lista de chaves cadastradas exibindo apenas nomes, prefixos mascarados e datas de uso.',
  security: [{ AdminKeyAuth: [] }],
  headers: z.object({
    'x-admin-key': z.string().optional().describe('Chave mestre de administracao do sistema (padrao: master_admin_secret)'),
  }),
  response: {
    [HttpStatus.OK]: z.object({
      statusCode: z.number().default(HttpStatus.OK),
      data: z.array(ApiKeyItemSchema),
    }).describe('Lista de chaves de API recuperadas com sucesso'),
    [HttpStatus.UNAUTHORIZED]: ErrorResponseSchema.describe('Acesso negado: header x-admin-key ausente ou invalido'),
    [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorResponseSchema.describe('Erro interno no servidor'),
  },
};

export const revokeApiKeyRouteSchema = {
  tags: ['API Keys'],
  summary: 'Revoga/desativa uma chave de API pelo ID (Requer Master Key)',
  description: 'Desativa permanentemente a chave especificada, impedindo novos disparos de e-mails atraves dela.',
  security: [{ AdminKeyAuth: [] }],
  headers: z.object({
    'x-admin-key': z.string().optional().describe('Chave mestre de administracao do sistema (padrao: master_admin_secret)'),
  }),
  params: ApiKeyParamsSchema,
  response: {
    [HttpStatus.OK]: z.object({
      statusCode: z.number().default(HttpStatus.OK),
      message: z.string(),
      data: ApiKeyItemSchema,
    }).describe('Chave revogada com sucesso'),
    [HttpStatus.BAD_REQUEST]: ErrorResponseSchema.describe('Parametro ID fornecido nao e um UUID valido'),
    [HttpStatus.UNAUTHORIZED]: ErrorResponseSchema.describe('Acesso negado: header x-admin-key ausente ou invalido'),
    [HttpStatus.NOT_FOUND]: ErrorResponseSchema.describe('Chave de API nao encontrada'),
    [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorResponseSchema.describe('Erro interno no servidor'),
  },
};
