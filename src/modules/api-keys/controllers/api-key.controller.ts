import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyInput } from '../dtos/api-key.dto';
import { HttpStatus } from '../../../shared/enums/http-status.enum';

export class ApiKeyController {
  private service: ApiKeyService;

  constructor(service?: ApiKeyService) {
    this.service = service || new ApiKeyService();
  }

  async create(request: FastifyRequest<{ Body: CreateApiKeyInput }>, reply: FastifyReply) {
    const { name } = request.body;
    const result = await this.service.create(name);

    return reply.status(HttpStatus.OK).send({
      statusCode: HttpStatus.OK,
      message: 'Chave de API gerada com sucesso. Guarde o segredo "apiKey", pois ele nao podera ser recuperado novamente.',
      data: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        keyPrefix: result.apiKey.keyPrefix,
        apiKey: result.rawKey,
        isActive: result.apiKey.isActive,
        createdAt: result.apiKey.createdAt,
      },
    });
  }

  async list(_request: FastifyRequest, reply: FastifyReply) {
    const keys = await this.service.list();

    return reply.status(HttpStatus.OK).send({
      statusCode: HttpStatus.OK,
      data: keys,
    });
  }

  async revoke(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const revoked = await this.service.revoke(id);

    return reply.status(HttpStatus.OK).send({
      statusCode: HttpStatus.OK,
      message: 'Chave de API revogada com sucesso.',
      data: revoked,
    });
  }
}
