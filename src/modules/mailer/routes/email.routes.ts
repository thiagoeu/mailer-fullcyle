import { FastifyInstance } from 'fastify';
import { EmailController } from '../controllers/email.controller';

export async function emailRoutes(app: FastifyInstance) {
  const controller = new EmailController();

  // Enfileira um novo e-mail
  app.post('/send', controller.send.bind(controller));

  // Consulta o status de um e-mail pelo ID
  app.get('/:id', controller.getById.bind(controller));
}

