import client from 'prom-client';
import { emailQueue } from '../../modules/mailer/queues/email.queue';

// Coleta métricas padrão do processo Node.js (CPU, memória heap, event loop lag, etc.)
client.collectDefaultMetrics({ prefix: 'node_' });

/**
 * 1. Contador de E-mails
 * Registra o volume total de e-mails que passaram pelo sistema
 */
export const emailsTotalCounter = new client.Counter({
  name: 'mailer_emails_total',
  help: 'Total de e-mails processados no sistema por status e provedor',
  labelNames: ['status', 'provider'] as const,
});

/**
 * 2. Histograma de Duração do Envio SMTP
 * Mede a latência da comunicação com o servidor SMTP (ex: Gmail)
 */
export const emailSendDurationHistogram = new client.Histogram({
  name: 'mailer_send_duration_seconds',
  help: 'Duração em segundos da chamada ao transporte SMTP',
  labelNames: ['provider', 'success'] as const,
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5, 10], // Intervalos em segundos
});

/**
 * 3. Gauge do Estado da Fila BullMQ
 * Mede o número instantâneo de itens em cada estado da fila do Redis
 */
export const queueJobsGauge = new client.Gauge({
  name: 'mailer_queue_jobs_count',
  help: 'Número atual de jobs na fila BullMQ por estado',
  labelNames: ['state'] as const,
  async collect() {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis metrics timeout')), 1000)
      );
      const getCounts = async () => {
        const client = await emailQueue.client;
        if (client.status === 'ready') {
          return await emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        }
        return null;
      };
      const counts = await Promise.race([getCounts(), timeoutPromise]);
      if (counts) {
        this.set({ state: 'waiting' }, counts.waiting);
        this.set({ state: 'active' }, counts.active);
        this.set({ state: 'completed' }, counts.completed);
        this.set({ state: 'failed' }, counts.failed);
        this.set({ state: 'delayed' }, counts.delayed);
      }
    } catch {
      // Falha silenciosa para não quebrar a coleta se o Redis estiver reiniciando
    }
  },
});

/**
 * 4. Histograma de Requisições HTTP
 * Mede o tempo de resposta e status code das rotas da API
 */
export const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração em segundos das requisições HTTP da API',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

export const metricsRegistry = client.register;

