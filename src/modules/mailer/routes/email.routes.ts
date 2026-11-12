import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { EmailController } from '../controllers/email.controller';
import { sendEmailRouteSchema, getEmailByIdRouteSchema } from '../schemas/email.schema';
import { apiKeyAuthMiddleware } from '../../../shared/middleware/auth.middleware';

export async function emailRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  const controller = new EmailController();

  // Protege todas as rotas deste plugin (/emails) com autenticacao via API Key
  app.addHook('preHandler', apiKeyAuthMiddleware);

  // Enfileira um novo e-mail para processamento assincrono
  typedApp.post('/send', { schema: sendEmailRouteSchema }, controller.send.bind(controller));

  // Consulta o status de entrega de um e-mail pelo ID
  typedApp.get('/:id', { schema: getEmailByIdRouteSchema }, controller.getById.bind(controller));
}
