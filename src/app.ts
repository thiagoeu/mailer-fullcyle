import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { emailRoutes } from './modules/mailer/routes/email.routes';
import { AppDataSource } from './database/data-source';
import { emailQueue } from './modules/mailer/queues/email.queue';

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // CORS liberado para integração com frontends e clientes
  app.register(cors, {
    origin: '*',
  });

  // Healthcheck completo: verifica saúde do servidor HTTP, PostgreSQL e Redis
  app.get('/health', async (_req, reply) => {
    const isDbConnected = AppDataSource.isInitialized;
    let isRedisConnected = false;

    try {
      const client = await emailQueue.client;
      const pong = await client.ping();
      isRedisConnected = pong === 'PONG';
    } catch {
      isRedisConnected = false;
    }

    const healthy = isDbConnected && isRedisConnected;

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbConnected ? 'UP' : 'DOWN',
        redis: isRedisConnected ? 'UP' : 'DOWN',
      },
    });
  });

  // Registro do módulo de e-mails sob o prefixo /emails
  app.register(emailRoutes, { prefix: '/emails' });

  return app;
}

