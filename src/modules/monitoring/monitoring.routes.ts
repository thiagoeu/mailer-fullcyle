import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppDataSource } from '../../database/data-source';
import { emailQueue } from '../mailer/queues/email.queue';
import { metricsRegistry } from '../../shared/metrics';
import { SwaggerConstants } from '../../shared/constants/swagger.constants';
import { HttpStatus } from '../../shared/enums/http-status.enum';

/**
 * Rotas de Observabilidade e Monitoramento da aplicacao
 */
export async function monitoringRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Endpoint de Healthcheck da aplicacao
  typedApp.get(
    '/health',
    {
      schema: {
        tags: [SwaggerConstants.TAG_MONITORING],
        summary: 'Verifica a saude da API e das conexoes com banco e fila',
        description: 'Retorna o status operacional da API, conexao com o banco relacional PostgreSQL e conectividade com a fila Redis.',
        response: {
          [HttpStatus.OK]: z.object({
            status: z.enum(['UP', 'DOWN']),
            timestamp: z.string(),
            services: z.object({
              database: z.enum(['UP', 'DOWN']),
              redis: z.enum(['UP', 'DOWN']),
            }),
          }).describe('Todos os servicos operacionais (HTTP 200)'),
          [HttpStatus.SERVICE_UNAVAILABLE]: z.object({
            status: z.enum(['UP', 'DOWN']),
            timestamp: z.string(),
            services: z.object({
              database: z.enum(['UP', 'DOWN']),
              redis: z.enum(['UP', 'DOWN']),
            }),
          }).describe('Algum servico dependente esta indisponivel (HTTP 503)'),
        },
      },
    },
    async (_req, reply) => {
      const isDbConnected = AppDataSource.isInitialized;
      let isRedisConnected = false;

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis healthcheck timeout')), 1000)
        );
        const checkRedis = async () => {
          const client = await emailQueue.client;
          if (client.status === 'ready') {
            const pong = await (client as any).ping();
            return pong === 'PONG';
          }
          return false;
        };
        isRedisConnected = await Promise.race([checkRedis(), timeoutPromise]);
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

  // Endpoint de raspagem de metricas do Prometheus
  typedApp.get(
    '/metrics',
    {
      schema: {
        tags: [SwaggerConstants.TAG_MONITORING],
        summary: 'Coleta e exposicao de metricas no formato Prometheus',
        description: 'Retorna contadores de vazao, latencias SMTP (Metodo RED) e gauges da fila BullMQ para ingestao pelo Prometheus.',
        response: {
          [HttpStatus.OK]: z.string().describe('Metricas formatadas em padrao texto OpenMetrics/Prometheus'),
        },
      },
      logLevel: 'silent',
    },
    async (_req, reply) => {
      reply.header('Content-Type', metricsRegistry.contentType);
      return reply.send(await metricsRegistry.metrics());
    }
  );
}

