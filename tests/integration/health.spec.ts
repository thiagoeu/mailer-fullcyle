import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
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

