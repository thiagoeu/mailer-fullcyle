import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { EmailController } from '../controllers/email.controller';
import { sendEmailRouteSchema, getEmailByIdRouteSchema } from '../schemas/email.schema';

export async function emailRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  const controller = new EmailController();

  // Enfileira um novo e-mail para processamento assincrono
  typedApp.post('/send', { schema: sendEmailRouteSchema }, controller.send.bind(controller));

  // Consulta o status de entrega de um e-mail pelo ID
  typedApp.get('/:id', { schema: getEmailByIdRouteSchema }, controller.getById.bind(controller));
}
