import crypto from 'node:crypto';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/data-source';
import { ApiKey } from '../../../database/entities/ApiKey';
import { NotFoundError } from '../../../shared/errors/not-found-error';

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  rawKey: string;
}

export class ApiKeyService {
  private repository: Repository<ApiKey>;

  constructor(repository?: Repository<ApiKey>) {
    this.repository = repository || AppDataSource.getRepository(ApiKey);
  }

  /**
   * Calcula o hash SHA-256 de uma chave em texto puro
   */
  public static hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Cria uma nova chave com geracao criptografica aleatoria (24 bytes hex)
   * e armazena apenas o hash no banco. Retorna a chave completa em texto puro UMA UNICA VEZ.
   */
  async create(name: string): Promise<CreateApiKeyResult> {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `mls_live_${randomHex}`;
    const keyHash = ApiKeyService.hashKey(rawKey);
    const keyPrefix = `${rawKey.slice(0, 14)}...`;

    const apiKey = this.repository.create({
      name,
      keyHash,
      keyPrefix,
      isActive: true,
    });

    const saved = await this.repository.save(apiKey);

    return {
      apiKey: saved,
      rawKey,
    };
  }

  /**
   * Lista todas as chaves cadastradas (sem expor o hash completo)
   */
  async list(): Promise<ApiKey[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoga/desativa uma chave pelo ID
   */
  async revoke(id: string): Promise<ApiKey> {
    const key = await this.repository.findOne({ where: { id } });
    if (!key) {
      throw new NotFoundError(`Chave de API com ID "${id}" nao foi encontrada.`);
    }

    key.isActive = false;
    return this.repository.save(key);
  }

  /**
   * Valida se uma chave fornecida em texto puro existe e esta ativa
   */
  async validateKey(rawKey: string): Promise<boolean> {
    const keyHash = ApiKeyService.hashKey(rawKey);
    const key = await this.repository.findOne({
      where: { keyHash, isActive: true },
    });

    if (!key) {
      return false;
    }

    // Registra o uso da chave de forma nao bloqueante
    this.repository.update(key.id, { lastUsedAt: new Date() }).catch(() => {});
    return true;
  }
}
