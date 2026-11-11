import 'dotenv/config';
import { AppDataSource } from '../database/data-source';
import { setupEmailWorker } from '../modules/mailer/workers/email.worker';
import { buildApp } from '../app';
import { emailQueue } from '../modules/mailer/queues/email.queue';

async function testApi() {
  console.log('🧪 Iniciando testes de integração da API Fastify...\n');

  // Inicializa banco e worker
  await AppDataSource.initialize();
  const worker = setupEmailWorker();
  const app = buildApp();
  await app.ready();

  const targetEmail = process.env.GOOGLE_ACCOUNT_USER || 'contatochecker@gmail.com';

  // 1. Teste de Healthcheck
  console.log('--- 1. Testando GET /health ---');
  const healthRes = await app.inject({
    method: 'GET',
    url: '/health',
  });
  console.log('Status:', healthRes.statusCode);
  console.log('Resposta:', healthRes.json());

  // 2. Teste de Validação Zod (payload com erro proposital)
  console.log('\n--- 2. Testando POST /emails/send com payload inválido ---');
  const invalidRes = await app.inject({
    method: 'POST',
    url: '/emails/send',
    payload: {
      to: 'email-invalido-sem-arroba',
      subject: '',
      // body ausente
    },
  });
  console.log('Status esperado (400):', invalidRes.statusCode);
  console.log('Detalhes dos erros Zod:', invalidRes.json());

  // 3. Teste de Envio Válido com Idempotência
  console.log('\n--- 3. Testando POST /emails/send válido com IdempotencyKey ---');
  const idempotencyKey = `teste-idemp-${Date.now()}`;

  const sendRes = await app.inject({
    method: 'POST',
    url: '/emails/send',
    headers: {
      'idempotency-key': idempotencyKey,
    },
    payload: {
      to: targetEmail,
      subject: '🚀 Disparo Real via API Fastify + BullMQ + TypeORM',
      body: '<h3>Olá!</h3><p>Este e-mail foi recebido pela <strong>API Fastify</strong>, validado por Zod e processado via fila assíncrona.</p>',
    },
  });
  console.log('Status esperado (202):', sendRes.statusCode);
  const sendData = sendRes.json();
  console.log('Resposta:', sendData);
  const createdEmailId = sendData.email.id;

  // 4. Teste de Idempotência (mesma requisição com a mesma chave)
  console.log('\n--- 4. Testando Idempotência: reenvio com a MESMA chave ---');
  const duplicateRes = await app.inject({
    method: 'POST',
    url: '/emails/send',
    headers: {
      'idempotency-key': idempotencyKey,
    },
    payload: {
      to: targetEmail,
      subject: 'Assunto diferente (deve ser ignorado pela idempotência)',
      body: 'Corpo diferente',
    },
  });
  console.log('Status esperado (200 - Idempotência acionada):', duplicateRes.statusCode);
  console.log('Resposta:', duplicateRes.json());

  // 5. Aguarda 6 segundos para o Worker processar o disparo via Gmail
  console.log('\n⏳ Aguardando o Worker processar o disparo via Gmail SMTP...');
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // 6. Teste de Consulta GET /emails/:id
  console.log('\n--- 5. Testando GET /emails/:id ---');
  const getRes = await app.inject({
    method: 'GET',
    url: `/emails/${createdEmailId}`,
  });
  console.log('Status:', getRes.statusCode);
  console.log('Registro atualizado no banco:', getRes.json());

  // Encerramento
  await app.close();
  await worker.close();
  await emailQueue.close();
  await AppDataSource.destroy();
  console.log('\n✅ Todos os testes da API concluídos com sucesso!');
  process.exit(0);
}

testApi().catch((err) => {
  console.error('❌ Falha nos testes da API:', err);
  process.exit(1);
});

