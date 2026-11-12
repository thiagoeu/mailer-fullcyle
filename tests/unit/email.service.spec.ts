import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailStatus } from '../../src/shared/enums/email-status.enum';
import { NotFoundError } from '../../src/shared/errors/not-found-error';

// vi.hoisted garante que as referencias de mock estejam disponiveis antes do hoisting do vi.mock
const { mockRepository, mockAddEmailToQueue, mockEmailsTotalCounter } = vi.hoisted(() => ({
  mockRepository: {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  },
  mockAddEmailToQueue: vi.fn(),
  mockEmailsTotalCounter: {
    inc: vi.fn(),
  },
}));

vi.mock('../../src/database/data-source', () => ({
  AppDataSource: {
    getRepository: vi.fn(() => mockRepository),
  },
}));

vi.mock('../../src/modules/mailer/queues/email.queue', () => ({
  addEmailToQueue: mockAddEmailToQueue,
}));

vi.mock('../../src/shared/metrics', () => ({
  emailsTotalCounter: mockEmailsTotalCounter,
}));

// Importa o servico apos configurar os mocks
import { EmailService } from '../../src/modules/mailer/services/email.service';

describe('EmailService (Unit - Mocks)', () => {
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    emailService = new EmailService();
  });

  describe('enqueueEmail', () => {
    it('deve enfileirar um novo e-mail com sucesso e registrar metrica', async () => {
      const inputData = {
        to: 'destinatario@exemplo.com',
        subject: 'Assunto do Teste',
        body: '<p>Mensagem teste</p>',
        idempotencyKey: 'chave-unica-123',
      };

      const mockSavedEmail = {
        id: 'uuid-gerado-123',
        ...inputData,
        status: EmailStatus.PENDING,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockSavedEmail);
      mockRepository.save.mockResolvedValue(mockSavedEmail);
      mockAddEmailToQueue.mockResolvedValue({ id: 'job-1' });

      const result = await emailService.enqueueEmail(inputData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: 'chave-unica-123' },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAddEmailToQueue).toHaveBeenCalledWith('uuid-gerado-123');
      expect(mockEmailsTotalCounter.inc).toHaveBeenCalledWith({
        status: 'queued',
        provider: expect.any(String),
      });
      expect(result.alreadyExists).toBe(false);
      expect(result.email.id).toBe('uuid-gerado-123');
    });

    it('deve retornar registro existente sem criar novo job quando a chave de idempotencia ja existir', async () => {
      const existingEmail = {
        id: 'uuid-existente-456',
        to: 'cliente@exemplo.com',
        subject: 'Email ja cadastrado',
        body: 'Corpo',
        idempotencyKey: 'chave-duplicada',
        status: EmailStatus.PENDING,
      };

      mockRepository.findOne.mockResolvedValue(existingEmail);

      const result = await emailService.enqueueEmail({
        to: 'cliente@exemplo.com',
        subject: 'Tentativa duplicada',
        body: 'Corpo novo',
        idempotencyKey: 'chave-duplicada',
      });

      expect(result.alreadyExists).toBe(true);
      expect(result.email.id).toBe('uuid-existente-456');
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockAddEmailToQueue).not.toHaveBeenCalled();
    });

    it('deve estruturar corretamente os metadados quando o envio for baseado em template Handlebars', async () => {
      const inputWithTemplate = {
        to: 'usuario@exemplo.com',
        subject: 'Boas-vindas',
        template: 'welcome',
        templateVariables: { name: 'Thiago' },
        metadata: { campaign: 'onboarding' },
      };

      const mockSavedEmail = {
        id: 'uuid-template-789',
        to: inputWithTemplate.to,
        subject: inputWithTemplate.subject,
        body: '',
        metadata: {
          campaign: 'onboarding',
          template: 'welcome',
          templateVariables: { name: 'Thiago' },
        },
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockSavedEmail);
      mockRepository.save.mockResolvedValue(mockSavedEmail);

      const result = await emailService.enqueueEmail(inputWithTemplate);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            campaign: 'onboarding',
            template: 'welcome',
            templateVariables: { name: 'Thiago' },
          }),
        })
      );
      expect(result.alreadyExists).toBe(false);
      expect(mockAddEmailToQueue).toHaveBeenCalledWith('uuid-template-789');
    });
  });

  describe('getEmailById', () => {
    it('deve retornar o e-mail quando o ID for encontrado', async () => {
      const mockEmail = { id: 'uuid-123', to: 'teste@exemplo.com' };
      mockRepository.findOne.mockResolvedValue(mockEmail);

      const result = await emailService.getEmailById('uuid-123');

      expect(result).toEqual(mockEmail);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-123' } });
    });

    it('deve lancar NotFoundError quando o e-mail nao existir', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(emailService.getEmailById('uuid-inexistente')).rejects.toThrow(NotFoundError);
    });
  });
});
