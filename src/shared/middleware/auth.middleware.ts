import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../errors/unauthorized-error';
import { ApiKeyService } from '../../modules/api-keys/services/api-key.service';

let apiKeyServiceInstance: ApiKeyService | null = null;

function getApiKeyService(): ApiKeyService {
  if (!apiKeyServiceInstance) {
    apiKeyServiceInstance = new ApiKeyService();
  }
  return apiKeyServiceInstance;
}

/**
 * Middleware para validar a presenca e autenticidade da chave mestre administrativa (x-admin-key)
 */
export async function adminAuthMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const adminKey = request.headers['x-admin-key'];
  const expectedMasterKey = process.env.ADMIN_MASTER_KEY || 'master_admin_secret';

  if (!adminKey || adminKey !== expectedMasterKey) {
    throw new UnauthorizedError('Acesso administrativo nao autorizado. Header "x-admin-key" ausente ou invalido.');
  }
}

/**
 * Middleware para validar chaves de envio x-api-key contra a base de dados (hash SHA-256)
 * ou contra a chave estatica de ambiente de desenvolvimento.
 */
export async function apiKeyAuthMiddleware(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    throw new UnauthorizedError('Acesso nao autorizado. Header "x-api-key" ausente ou invalido.');
  }

  // 1. Compatibilidade com a chave de ambiente estatica (dev e testes)
  const expectedDevKey = process.env.API_SECRET_KEY || 'default_secret_key';
  if (apiKey === expectedDevKey) {
    return;
  }

  // 2. Consulta dinamica na tabela api_keys via hash SHA-256
  try {
    const isValid = await getApiKeyService().validateKey(apiKey);
    if (isValid) {
      return;
    }
  } catch {
    // Falha na consulta de banco segue para rejeicao
  }

  throw new UnauthorizedError('Acesso nao autorizado. Header "x-api-key" ausente ou invalido.');
}
