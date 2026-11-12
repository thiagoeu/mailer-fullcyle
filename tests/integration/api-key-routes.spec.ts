import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { ApiKeyService } from '../../src/modules/api-keys/services/api-key.service';
import { EmailService } from '../../src/modules/mailer/services/email.service';
import { HttpStatus } from '../../src/shared/enums/http-status.enum';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { EmailStatus } from '../../src/shared/enums/email-status.enum';

const MASTER_KEY = 'master_admin_secret';
const VALID_UUID = 'c28a9b24-4f01-4be3-b9dc-461320ef4147';
const NON_EXISTENT_UUID = 'e39b0c35-5f12-4cf4-c0ed-572431fa5258';

describe('API Key Routes (Integration - In Memory via app.inject)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Autenticacao Administrativa (x-admin-key)', () => {
    it('deve rejeitar POST /api-keys com 401 Unauthorized quando o header x-admin-key estiver ausente', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        payload: {
          name: 'Sistema de Faturamento',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      const json = JSON.parse(response.body);
      expect(json.message).toContain('Acesso administrativo nao autorizado');
    });

    it('deve rejeitar POST /api-keys com 401 Unauthorized quando o header x-admin-key for invalido', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          'x-admin-key': 'chave_mestre_incorreta',
        },
        payload: {
          name: 'Sistema de Faturamento',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('deve rejeitar GET /api-keys com 401 Unauthorized sem a chave mestre', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-keys',
      });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('deve rejeitar PATCH /api-keys/:id/revoke com 401 Unauthorized sem a chave mestre', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api-keys/${VALID_UUID}/revoke`,
      });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api-keys (Criacao de Chaves)', () => {
    it('deve gerar uma nova chave de API com sucesso e retornar o segredo rawKey apenas uma vez', async () => {
      const mockResult = {
        apiKey: {
          id: VALID_UUID,
          name: 'Stripe Webhooks',
          keyPrefix: 'mls_live_123456...',
          keyHash: 'hash-sha256-secreto',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: null,
        },
        rawKey: 'mls_live_1234567890abcdef1234567890abcdef1234567890abcdef',
      };

      vi.spyOn(ApiKeyService.prototype, 'create').mockResolvedValue(mockResult as any);

      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          'x-admin-key': MASTER_KEY,
        },
        payload: {
          name: 'Stripe Webhooks',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.OK);
      const json = JSON.parse(response.body);
      expect(json.statusCode).toBe(HttpStatus.OK);
      expect(json.data.id).toBe(VALID_UUID);
      expect(json.data.name).toBe('Stripe Webhooks');
      expect(json.data.keyPrefix).toBe('mls_live_123456...');
      expect(json.data.apiKey).toBe('mls_live_1234567890abcdef1234567890abcdef1234567890abcdef');
      expect(json.data.isActive).toBe(true);
      expect(json.data.keyHash).toBeUndefined();
    });

    it('deve retornar 400 Bad Request se o corpo da requisicao for invalido (nome ausente ou curto)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-keys',
        headers: {
          'x-admin-key': MASTER_KEY,
        },
        payload: {
          name: 'A',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      const json = JSON.parse(response.body);
      expect(json.error).toBe('Bad Request');
    });
  });

  describe('GET /api-keys (Listagem de Chaves)', () => {
    it('deve retornar a lista de chaves cadastradas sem expor o segredo nem o hash', async () => {
      const mockList = [
        {
          id: VALID_UUID,
          name: 'E-commerce Checkout',
          keyPrefix: 'mls_live_abcdef...',
          isActive: true,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(ApiKeyService.prototype, 'list').mockResolvedValue(mockList as any);

      const response = await app.inject({
        method: 'GET',
        url: '/api-keys',
        headers: {
          'x-admin-key': MASTER_KEY,
        },
      });

      expect(response.statusCode).toBe(HttpStatus.OK);
      const json = JSON.parse(response.body);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].id).toBe(VALID_UUID);
      expect(json.data[0].keyPrefix).toBe('mls_live_abcdef...');
      expect(json.data[0].apiKey).toBeUndefined();
    });
  });

  describe('PATCH /api-keys/:id/revoke (Revogacao de Chaves)', () => {
    it('deve revogar com sucesso uma chave existente respondendo status 200 e isActive: false', async () => {
      const mockRevoked = {
        id: VALID_UUID,
        name: 'Chave para Desativar',
        keyPrefix: 'mls_live_revoked...',
        isActive: false,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(ApiKeyService.prototype, 'revoke').mockResolvedValue(mockRevoked as any);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api-keys/${VALID_UUID}/revoke`,
        headers: {
          'x-admin-key': MASTER_KEY,
        },
      });

      expect(response.statusCode).toBe(HttpStatus.OK);
      const json = JSON.parse(response.body);
      expect(json.data.isActive).toBe(false);
      expect(json.message).toContain('revogada com sucesso');
    });

    it('deve retornar 404 Not Found ao tentar revogar uma chave que nao existe', async () => {
      vi.spyOn(ApiKeyService.prototype, 'revoke').mockRejectedValue(
        new NotFoundError(`Chave de API com ID "${NON_EXISTENT_UUID}" nao foi encontrada.`)
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/api-keys/${NON_EXISTENT_UUID}/revoke`,
        headers: {
          'x-admin-key': MASTER_KEY,
        },
      });

      expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      const json = JSON.parse(response.body);
      expect(json.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('deve retornar 400 Bad Request se o ID fornecido nao for um UUID valido', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api-keys/id-invalido-123/revoke',
        headers: {
          'x-admin-key': MASTER_KEY,
        },
      });

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Integracao End-to-End com Envio de E-mails (/emails/send)', () => {
    it('deve permitir envio com chave de API dinamica valida e rejeitar apos a revogacao', async () => {
      const dynamicKey = 'mls_live_dynamic_integration_test_secret_key_123';

      // 1. Chave valida no banco
      const validateSpy = vi.spyOn(ApiKeyService.prototype, 'validateKey').mockResolvedValue(true);

      vi.spyOn(EmailService.prototype, 'enqueueEmail').mockResolvedValue({
        email: {
          id: VALID_UUID,
          to: 'cliente@loja.com',
          from: 'mailer@local.test',
          subject: 'Teste de Autorizacao Dinamica',
          body: '<p>OK</p>',
          status: EmailStatus.PENDING,
          attempts: 0,
          maxAttempts: 3,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        alreadyExists: false,
      });

      const responseBeforeRevoke = await app.inject({
        method: 'POST',
        url: '/emails/send',
        headers: {
          'x-api-key': dynamicKey,
        },
        payload: {
          to: 'cliente@loja.com',
          subject: 'Teste de Autorizacao Dinamica',
          body: '<p>OK</p>',
        },
      });

      expect(responseBeforeRevoke.statusCode).toBe(HttpStatus.ACCEPTED);
      expect(validateSpy).toHaveBeenCalledWith(dynamicKey);

      // 2. Apos revogacao: validateKey retorna false
      validateSpy.mockResolvedValue(false);

      const responseAfterRevoke = await app.inject({
        method: 'POST',
        url: '/emails/send',
        headers: {
          'x-api-key': dynamicKey,
        },
        payload: {
          to: 'cliente@loja.com',
          subject: 'Tentativa com Chave Revogada',
          body: '<p>Falha</p>',
        },
      });

      expect(responseAfterRevoke.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      const jsonError = JSON.parse(responseAfterRevoke.body);
      expect(jsonError.message).toContain('Acesso nao autorizado');
    });
  });
});

