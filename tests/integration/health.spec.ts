import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';

// Mocka a fila do Redis para garantir execucao rapida em memoria sem depender de container externo ativo
vi.mock('../../src/modules/mailer/queues/email.queue', () => ({
  emailQueue: {
    client: Promise.resolve({
      status: 'ready',
      ping: vi.fn().mockResolvedValue('PONG'),
    }),
    getJobCounts: vi.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
  },
}));

import { buildApp } from '../../src/app';

describe('Health and Metrics API (Integration - In Memory)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve responder status HTTP no endpoint /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('services');
  });

  it('deve responder status 200 e conteudo de metricas no endpoint /metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('http_request_duration_seconds');
    expect(response.body).toContain('mailer_emails_total');
  });
});
