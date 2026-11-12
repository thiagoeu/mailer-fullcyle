import 'dotenv/config';
import { AppDataSource } from './database/data-source';
import { setupEmailWorker } from './modules/mailer/workers/email.worker';
import { emailQueue } from './modules/mailer/queues/email.queue';
import { buildApp } from './app';

async function bootstrap() {
  const port = Number(process.env.PORT) || 3333;
  const host = '0.0.0.0';

  console.log('[INFO] Inicializando o Mailer Service...');

  // 1. Conexao com o PostgreSQL
  await AppDataSource.initialize();
  console.log('[INFO] Conexao com PostgreSQL estabelecida com sucesso.');

  // 2. Inicializacao do Worker em segundo plano
  const worker = setupEmailWorker();
  console.log('[INFO] BullMQ Worker ativo e processando filas.');

  // 3. Inicializacao do Servidor Fastify
  const app = buildApp();

  await app.listen({ port, host });
  console.log(`[INFO] API HTTP rodando em http://localhost:${port}`);
  console.log(`[INFO] Healthcheck disponivel em http://localhost:${port}/health`);

  // 4. Graceful Shutdown (Encerramento gracioso em caso de parada do container/processo)
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[INFO] Sinal ${signal} recebido. Encerrando servicos com seguranca...`);
    try {
      await app.close();
      console.log('[INFO] Servidor HTTP encerrado.');

      await worker.close();
      console.log('[INFO] Worker encerrado.');

      await emailQueue.close();
      console.log('[INFO] Conexao com fila encerrada.');

      await AppDataSource.destroy();
      console.log('[INFO] Conexao com PostgreSQL encerrada.');

      console.log('[INFO] Processo finalizado com sucesso.');
      process.exit(0);
    } catch (error) {
      console.error('[ERROR] Erro durante o encerramento gracioso:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('[FATAL] Falha critica ao inicializar a aplicacao:', error);
  process.exit(1);
});
