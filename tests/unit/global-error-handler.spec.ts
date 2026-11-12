import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { globalErrorHandler } from '../../src/shared/errors/global-error-handler';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { HttpStatus } from '../../src/shared/enums/http-status.enum';

describe('Global Error Handler (Unit)', () => {
  const createMockReply = () => {
    const reply: any = {};
    reply.status = vi.fn().mockReturnValue(reply);
    reply.send = vi.fn().mockReturnValue(reply);
    return reply;
  };

  const createMockRequest = () => ({
    url: '/emails/send',
    method: 'POST',
    log: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  });

  it('deve formatar erro de validacao do Zod com status 400', () => {
    const schema = z.object({ email: z.string().email('E-mail invalido') });
    const result = schema.safeParse({ email: 'formato-invalido' });
    const zodError = !result.success ? result.error : null;

    const reply = createMockReply();
    const request = createMockRequest();
    globalErrorHandler(zodError as any, request as any, reply);

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Falha na validacao dos dados de entrada.',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'E-mail invalido',
          }),
        ]),
      })
    );
  });

  it('deve formatar erro operacional NotFoundError com status 404', () => {
    const error = new NotFoundError('E-mail nao encontrado');
    const reply = createMockReply();
    const request = createMockRequest();

    globalErrorHandler(error, request as any, reply);

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'NotFoundError',
        message: 'E-mail nao encontrado',
      })
    );
  });

  it('deve formatar erros genericos inesperados com status 500 sem vazar stack trace', () => {
    const error = new Error('Falha interna fatal');
    const reply = createMockReply();
    const request = createMockRequest();

    globalErrorHandler(error, request as any, reply);

    expect(request.log.error).toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
      })
    );
  });
});
