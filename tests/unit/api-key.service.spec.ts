import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService } from '../../src/modules/api-keys/services/api-key.service';
import { NotFoundError } from '../../src/shared/errors/not-found-error';

describe('ApiKeyService (Unit)', () => {
  let service: ApiKeyService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn((dto) => ({ id: 'mock-uuid', ...dto, createdAt: new Date(), updatedAt: new Date() })),
      save: vi.fn(async (entity) => entity),
      find: vi.fn(async () => []),
      findOne: vi.fn(),
      update: vi.fn(async () => {}),
    };
    service = new ApiKeyService(mockRepo);
  });

  it('deve gerar uma chave criptografica com prefixo mls_live_ e salvar o hash SHA-256', async () => {
    const result = await service.create('App Checkout');

    expect(result.rawKey).toMatch(/^mls_live_[0-9a-f]{48}$/);
    expect(result.apiKey.name).toBe('App Checkout');
    expect(result.apiKey.keyPrefix).toBe(result.rawKey.slice(0, 14) + '...');
    expect(result.apiKey.keyHash).toBe(ApiKeyService.hashKey(result.rawKey));
    expect(result.apiKey.isActive).toBe(true);
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it('deve validar com sucesso uma chave ativa e retornar true', async () => {
    const rawKey = 'mls_live_1234567890abcdef1234567890abcdef1234567890abcdef';
    const keyHash = ApiKeyService.hashKey(rawKey);

    mockRepo.findOne.mockResolvedValue({
      id: 'key-1',
      keyHash,
      isActive: true,
    });

    const isValid = await service.validateKey(rawKey);
    expect(isValid).toBe(true);
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { keyHash, isActive: true },
    });
  });

  it('deve retornar false caso a chave nao exista ou esteja inativa', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const isValid = await service.validateKey('chave_inexistente');
    expect(isValid).toBe(false);
  });

  it('deve revogar uma chave existente alterando isActive para false', async () => {
    const keyRecord = {
      id: 'key-to-revoke',
      name: 'App Teste',
      isActive: true,
    };

    mockRepo.findOne.mockResolvedValue(keyRecord);

    const revoked = await service.revoke('key-to-revoke');
    expect(revoked.isActive).toBe(false);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('deve lancar NotFoundError ao tentar revogar uma chave que nao existe', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(service.revoke('id-inexistente')).rejects.toThrow(NotFoundError);
  });
});
