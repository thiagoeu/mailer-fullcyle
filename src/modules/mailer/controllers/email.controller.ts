import { FastifyRequest, FastifyReply } from 'fastify';
import { EmailService } from '../services/email.service';
import { SendEmailSchema } from '../dtos/send-email.dto';

export class EmailController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * POST /emails/send
   * Recebe a solicitação de disparo e enfileira
   */
  async send(request: FastifyRequest, reply: FastifyReply) {
    // 1. Extração do idempotencyKey via header ou payload
    const headerKey = (request.headers['idempotency-key'] || request.headers['x-idempotency-key']) as string | undefined;

    const payload = {
      ...(request.body as object),
      ...(headerKey ? { idempotencyKey: headerKey } : {}),
    };

    // 2. Validação estrita com Zod
    const validationResult = SendEmailSchema.safeParse(payload);

    if (!validationResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados de envio inválidos.',
        details: validationResult.error.format(),
      });
    }

    // 3. Execução do serviço com idempotência
    const { email, alreadyExists } = await this.emailService.enqueueEmail(validationResult.data);

    if (alreadyExists) {
      return reply.status(200).send({
        statusCode: 200,
        message: 'E-mail previamente registrado (Idempotência acionada).',
        email,
      });
    }

    // Retorno padrão 202 Accepted para processamento assíncrono
    return reply.status(202).send({
      statusCode: 202,
      message: 'E-mail enfileirado com sucesso para processamento em segundo plano.',
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
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Nenhum e-mail encontrado com o ID '${id}'.`,
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      email,
    });
  }
}

