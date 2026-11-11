import 'dotenv/config';
import { AppDataSource } from '../database/data-source';
import { setupEmailWorker } from '../modules/mailer/workers/email.worker';
import { buildApp } from '../app';
import { emailQueue } from '../modules/mailer/queues/email.queue';

async function testMetrics() {
  console.log('📊 Iniciando teste das Métricas e Observabilidade...\n');

  await AppDataSource.initialize();
  const worker = setupEmailWorker();
  const app = buildApp();
  await app.ready();

  const targetEmail = process.env.GOOGLE_ACCOUNT_USER || 'contatochecker@gmail.com';

  // 1. Simula requisição para gerar métricas de API e fila
  console.log('1. Disparando envio via API para gerar métricas...');
  await app.inject({
    method: 'POST',
    url: '/emails/send',
    payload: {
      to: targetEmail,
      subject: '📈 Teste de Observabilidade Prometheus',
      body: '<p>Este e-mail está alimentando o Prometheus e o Grafana com métricas em tempo real.</p>',
    },
  });

  // Aguarda 6s para o worker processar e alimentar as métricas do SMTP
  console.log('⏳ Aguardando processamento do Worker para registrar métricas de envio SMTP...');
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // 2. Consulta o endpoint /metrics do Prometheus
  console.log('\n2. Consultando o endpoint GET /metrics...');
  const metricsRes = await app.inject({
    method: 'GET',
    url: '/metrics',
  });

  console.log('Status HTTP:', metricsRes.statusCode);
  const metricsText = metricsRes.body;

  // Filtra as métricas do nosso mailer no meio das métricas padrão do Node
  console.log('\n--- Amostra das Métricas Exportadas do Mailer Service ---');
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

  console.log('\n✅ Métricas validadas com sucesso!');
  process.exit(0);
}

testMetrics().catch((err) => {
  console.error('❌ Erro no teste de métricas:', err);
  process.exit(1);
});

