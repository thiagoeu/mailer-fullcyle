import 'dotenv/config';
import { AppDataSource } from '../database/data-source';
import { setupEmailWorker } from '../modules/mailer/workers/email.worker';
import { buildApp } from '../app';
import { emailQueue } from '../modules/mailer/queues/email.queue';

async function testMetrics() {
  console.log('[INFO] Iniciando teste das Metricas e Observabilidade...\n');

  await AppDataSource.initialize();
  const worker = setupEmailWorker();
  const app = buildApp();
  await app.ready();

  const targetEmail = process.env.GOOGLE_ACCOUNT_USER || 'contatochecker@gmail.com';

  // 1. Simula requisicao para gerar metricas de API e fila
  console.log('[INFO] 1. Disparando envio via API para gerar metricas...');
  await app.inject({
    method: 'POST',
    url: '/emails/send',
    payload: {
      to: targetEmail,
      subject: 'Teste de Observabilidade Prometheus',
      body: '<p>Este e-mail esta alimentando o Prometheus e o Grafana com metricas em tempo real.</p>',
    },
  });

  // Aguarda processamento do worker para alimentar metricas do SMTP
  console.log('[INFO] Aguardando processamento do Worker para registrar metricas de envio SMTP...');
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // 2. Consulta o endpoint /metrics do Prometheus
  console.log('\n[INFO] 2. Consultando o endpoint GET /metrics...');
  const metricsRes = await app.inject({
    method: 'GET',
    url: '/metrics',
  });

  console.log('Status HTTP:', metricsRes.statusCode);
  const metricsText = metricsRes.body;

  // Filtra as metricas do nosso mailer no meio das metricas padrao do Node
  console.log('\n--- Amostra das Metricas Exportadas do Mailer Service ---');
  const mailerLines = metricsText
    .split('\n')
    .filter(
      (line) =>
        line.startsWith('mailer_') ||
        line.startsWith('http_request_duration_seconds')
    )
    .join('\n');

  console.log(mailerLines);

  await app.close();
  await worker.close();
  await emailQueue.close();
  await AppDataSource.destroy();

  console.log('\n[INFO] Metricas validadas com sucesso.');
  process.exit(0);
}

testMetrics().catch((err) => {
  console.error('[ERROR] Erro no teste de metricas:', err);
  process.exit(1);
});
