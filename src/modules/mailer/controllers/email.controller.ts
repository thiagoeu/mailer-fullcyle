import { FastifyRequest, FastifyReply } from 'fastify';
import { EmailService } from '../services/email.service';
import { SendEmailSchema } from '../dtos/send-email.dto';
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
  async send(request: FastifyRequest, reply: FastifyReply) {
    // 1. Extracao do idempotencyKey via headers padronizados
    const headerKey = (
      request.headers[MessagesConstants.HEADER_IDEMPOTENCY_KEY] ||
      request.headers[MessagesConstants.HEADER_X_IDEMPOTENCY_KEY]
    ) as string | undefined;

    const payload = {
      ...(request.body as object),
      ...(headerKey ? { idempotencyKey: headerKey } : {}),
    };

    // 2. Validacao estrita com Zod
    const validationResult = SendEmailSchema.safeParse(payload);

    if (!validationResult.success) {
      return reply.status(HttpStatus.BAD_REQUEST).send({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: MessagesConstants.INVALID_PAYLOAD,
        details: validationResult.error.format(),
      });
    }

    // 3. Execucao do servico com idempotencia
    const { email, alreadyExists } = await this.emailService.enqueueEmail(validationResult.data);

    if (alreadyExists) {
      return reply.status(HttpStatus.OK).send({
        statusCode: HttpStatus.OK,
        message: MessagesConstants.EMAIL_IDEMPOTENCY_DETECTED,
        email,
      });
    }

    // Retorno padrao 202 Accepted para processamento assincrono
    return reply.status(HttpStatus.ACCEPTED).send({
      statusCode: HttpStatus.ACCEPTED,
      message: MessagesConstants.EMAIL_ENQUEUED_SUCCESS,
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

    if (!email) {
      return reply.status(HttpStatus.NOT_FOUND).send({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `${MessagesConstants.EMAIL_NOT_FOUND} (ID: '${id}').`,
      });
    }

    return reply.status(HttpStatus.OK).send({
      statusCode: HttpStatus.OK,
      email,
    });
  }
}
