import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { emailRoutes } from './modules/mailer/routes/email.routes';
import { AppDataSource } from './database/data-source';
import { emailQueue } from './modules/mailer/queues/email.queue';
import { metricsRegistry, httpRequestDurationHistogram } from './shared/metrics';

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

  // CORS liberado para integração
  app.register(cors, {
    origin: '*',
  });

  // Interceptador de métricas HTTP (mede a latência de cada requisição)
  app.addHook('onRequest', (request, _reply, done) => {
    (request as any).startTime = process.hrtime();
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    const startTime = (request as any).startTime;
    if (startTime) {
      const diff = process.hrtime(startTime);
      const durationInSeconds = diff[0] + diff[1] / 1e9;
      const route = request.routeOptions?.url || request.url;

      httpRequestDurationHistogram.observe(
        {
          method: request.method,
          route,
          status_code: reply.statusCode.toString(),
        },
        durationInSeconds
      );
    }
    done();
  });

  // Healthcheck completo
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

  // Endpoint de Métricas do Prometheus
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', metricsRegistry.contentType);
    return reply.send(await metricsRegistry.metrics());
  });

  // Registro do módulo de e-mails sob o prefixo /emails
  app.register(emailRoutes, { prefix: '/emails' });

  return app;
}
