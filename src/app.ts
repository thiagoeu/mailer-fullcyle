import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { emailRoutes } from './modules/mailer/routes/email.routes';
import { AppDataSource } from './database/data-source';
import { emailQueue } from './modules/mailer/queues/email.queue';
import { metricsRegistry, httpRequestDurationHistogram } from './shared/metrics';
import { swaggerOptions, swaggerUiOptions } from './config/swagger';
import { SwaggerConstants } from './shared/constants/swagger.constants';
import { HttpStatus } from './shared/enums/http-status.enum';
import { globalErrorHandler } from './shared/errors/global-error-handler';
import { z } from 'zod';

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

  // Integracao do Zod com o Fastify para validacao e documentacao automatica
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Manipulador global centralizado de erros
  app.setErrorHandler(globalErrorHandler);

  // CORS liberado para integracao
  app.register(cors, {
    origin: '*',
  });

  // Registro da documentacao Swagger / OpenAPI
  app.register(fastifySwagger, swaggerOptions);
  app.register(fastifySwaggerUi, swaggerUiOptions);

  // Interceptador de metricas HTTP (mede a latencia de cada requisicao)
  app.addHook('onRequest', (request, _reply, done) => {
    (request as any).startTime = process.hrtime();
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    const route = request.routeOptions?.url || request.url;

    // Ignora a propria rota /metrics e /docs para nao poluir o histograma
    if (route === '/metrics' || route.startsWith(SwaggerConstants.ROUTE_PREFIX)) {
      done();
      return;
    }

    const startTime = (request as any).startTime;
    if (startTime) {
      const diff = process.hrtime(startTime);
      const durationInSeconds = diff[0] + diff[1] / 1e9;

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

  // Healthcheck completo documentado
  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    {
      schema: {
        tags: [SwaggerConstants.TAG_MONITORING],
        summary: 'Verifica a saude da API e das conexoes com banco e fila',
        response: {
          [HttpStatus.OK]: z.object({
            status: z.enum(['UP', 'DOWN']),
            timestamp: z.string(),
            services: z.object({
              database: z.enum(['UP', 'DOWN']),
              redis: z.enum(['UP', 'DOWN']),
            }),
          }),
          [HttpStatus.SERVICE_UNAVAILABLE]: z.object({
            status: z.enum(['UP', 'DOWN']),
            timestamp: z.string(),
            services: z.object({
              database: z.enum(['UP', 'DOWN']),
              redis: z.enum(['UP', 'DOWN']),
            }),
          }),
        },
      },
    },
    async (_req, reply) => {
      const isDbConnected = AppDataSource.isInitialized;
      let isRedisConnected = false;

      try {
        const client = await emailQueue.client;
        const pong = await (client as any).ping();
        isRedisConnected = pong === 'PONG';
      } catch {
        isRedisConnected = false;
      }

      const healthy = isDbConnected && isRedisConnected;

      return reply.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).send({
        status: healthy ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        services: {
          database: isDbConnected ? 'UP' : 'DOWN',
          redis: isRedisConnected ? 'UP' : 'DOWN',
        },
      });
    }
  );

  // Endpoint de Metricas do Prometheus
  app.get('/metrics', { logLevel: 'silent' }, async (_req, reply) => {
    reply.header('Content-Type', metricsRegistry.contentType);
    return reply.send(await metricsRegistry.metrics());
  });

  // Registro do modulo de e-mails sob o prefixo /emails
  app.register(emailRoutes, { prefix: '/emails' });

  return app;
}
