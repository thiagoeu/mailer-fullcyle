import { FastifyRequest, FastifyReply } from 'fastify';
import { EmailService } from '../services/email.service';
import { SendEmailInput } from '../dtos/send-email.dto';
import { HttpStatus } from '../../../shared/enums/http-status.enum';
import { MessagesConstants } from '../../../shared/constants/messages.constants';

export class EmailController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * POST /emails/send
   * Recebe a solicitacao de disparo, valida e enfileira
   */
  async send(request: FastifyRequest<{ Body: SendEmailInput }>, reply: FastifyReply) {
    const payload = this.extractPayloadWithIdempotency(request);
    const { email, alreadyExists } = await this.emailService.enqueueEmail(payload);

    const statusCode = alreadyExists ? HttpStatus.OK : HttpStatus.ACCEPTED;
    const message = alreadyExists
      ? MessagesConstants.EMAIL_IDEMPOTENCY_DETECTED
      : MessagesConstants.EMAIL_ENQUEUED_SUCCESS;

    return reply.status(statusCode).send({
      statusCode,
      message,
      email,
    });
  }

  /**
   * GET /emails/:id
   * Consulta o status atual de entrega de um e-mail
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const email = await this.emailService.getEmailById(id);

    return reply.status(HttpStatus.OK).send({
      statusCode: HttpStatus.OK,
      email,
    });
  }

  /**
   * Extrai o corpo da requisicao e associa a chave de idempotencia enviada via headers HTTP
   */
  private extractPayloadWithIdempotency(request: FastifyRequest<{ Body: SendEmailInput }>): SendEmailInput {
    const headerKey = (
      request.headers[MessagesConstants.HEADER_IDEMPOTENCY_KEY] ||
      request.headers[MessagesConstants.HEADER_X_IDEMPOTENCY_KEY]
    ) as string | undefined;

    return {
      ...request.body,
      ...(headerKey ? { idempotencyKey: headerKey } : {}),
    };
  }
}
