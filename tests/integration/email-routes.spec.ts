import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { EmailService } from '../../src/modules/mailer/services/email.service';
import { EmailStatus } from '../../src/shared/enums/email-status.enum';
import { HttpStatus } from '../../src/shared/enums/http-status.enum';
import { NotFoundError } from '../../src/shared/errors/not-found-error';

// Garante isolamento total: mocka envio de e-mails para nao haver trafego de rede real
vi.mock('../../src/config/mail', () => ({
  createMailTransporter: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'mocked-id' }),
  })),
  mailConfig: { provider: 'mailpit', fromDefault: 'test@mailer.local' },
}));

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ANOTHER_VALID_UUID = 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac270b22';
const AUTH_HEADERS = { 'x-api-key': 'default_secret_key' };

const createMockEmailRecord = (overrides = {}) => ({
  id: VALID_UUID,
  to: 'destinatario@exemplo.com',
  from: 'test@mailer.local',
  subject: 'Assunto do Teste',
  body: '<p>Mensagem</p>',
  status: EmailStatus.PENDING,
  attempts: 0,
  maxAttempts: 3,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Email Routes (Integration - In Memory via app.inject)', () => {
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

  describe('Autenticacao por API Key (x-api-key)', () => {
    it('deve rejeitar POST /emails/send com 401 Unauthorized se o header x-api-key estiver ausente', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/emails/send',
        payload: {
          to: 'destinatario@exemplo.com',
          subject: 'Sem chave',
          body: '<p>Teste</p>',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      const json = JSON.parse(response.body);
      expect(json.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(json.message).toContain('Acesso nao autorizado');
    });

    it('deve rejeitar POST /emails/send com 401 Unauthorized se a chave for invalida', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/emails/send',
        headers: {
          'x-api-key': 'chave_incorreta_123',
        },
        payload: {
          to: 'destinatario@exemplo.com',
          subject: 'Chave errada',
          body: '<p>Teste</p>',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('deve rejeitar GET /emails/:id com 401 Unauthorized se o header x-api-key estiver ausente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/emails/${VALID_UUID}`,
      });

      expect(response.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /emails/send', () => {
    it('deve aceitar e enfileirar um e-mail valido respondendo status 202 Accepted', async () => {
      const mockEmail = createMockEmailRecord();

      vi.spyOn(EmailService.prototype, 'enqueueEmail').mockResolvedValue({
        email: mockEmail as any,
        alreadyExists: false,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/emails/send',
        headers: AUTH_HEADERS,
        payload: {
          to: 'destinatario@exemplo.com',
          subject: 'Assunto do Teste',
          body: '<p>Mensagem</p>',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.ACCEPTED);
      const json = JSON.parse(response.body);
      expect(json.statusCode).toBe(HttpStatus.ACCEPTED);
      expect(json.email.id).toBe(VALID_UUID);
      expect(json.message).toContain('enfileirado com sucesso');
    });

    it('deve responder status 200 OK quando a chave de idempotencia for detectada como existente', async () => {
      const existingEmail = createMockEmailRecord({
        id: ANOTHER_VALID_UUID,
        idempotencyKey: 'chave-idempotente-999',
      });

      vi.spyOn(EmailService.prototype, 'enqueueEmail').mockResolvedValue({
        email: existingEmail as any,
        alreadyExists: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/emails/send',
        headers: {
          ...AUTH_HEADERS,
          'x-idempotency-key': 'chave-idempotente-999',
        },
        payload: {
          to: 'destinatario@exemplo.com',
          subject: 'Email duplicado',
          body: '<p>Mensagem</p>',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.OK);
      const json = JSON.parse(response.body);
      expect(json.statusCode).toBe(HttpStatus.OK);
      expect(json.email.id).toBe(ANOTHER_VALID_UUID);
      expect(json.message).toContain('Idempotencia');
    });

    it('deve responder 400 Bad Request quando os dados do payload forem invalidos', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/emails/send',
        headers: AUTH_HEADERS,
        payload: {
          to: 'email-com-formato-invalido',
          subject: 'Sem corpo nem template',
        },
      });

      expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
      const json = JSON.parse(response.body);
      expect(json.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(json.message).toContain('Falha na validacao');
    });
  });

  describe('GET /emails/:id', () => {
    it('deve retornar 200 OK com os dados do e-mail quando o ID existir e chave for valida', async () => {
      const mockEmail = createMockEmailRecord({
        id: VALID_UUID,
        status: EmailStatus.SENT,
      });

      vi.spyOn(EmailService.prototype, 'getEmailById').mockResolvedValue(mockEmail as any);

      const response = await app.inject({
        method: 'GET',
        url: `/emails/${VALID_UUID}`,
        headers: AUTH_HEADERS,
      });

      expect(response.statusCode).toBe(HttpStatus.OK);
      const json = JSON.parse(response.body);
      expect(json.email.id).toBe(VALID_UUID);
      expect(json.email.status).toBe(EmailStatus.SENT);
    });

    it('deve retornar 404 Not Found quando o ID nao existir', async () => {
      vi.spyOn(EmailService.prototype, 'getEmailById').mockRejectedValue(
        new NotFoundError('E-mail nao encontrado no sistema.')
      );

      const response = await app.inject({
        method: 'GET',
        url: `/emails/${VALID_UUID}`,
        headers: AUTH_HEADERS,
      });

      expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
      const json = JSON.parse(response.body);
      expect(json.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(json.message).toContain('E-mail nao encontrado');
    });
  });
});
