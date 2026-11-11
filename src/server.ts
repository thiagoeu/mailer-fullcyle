import 'dotenv/config';
import { AppDataSource } from './database/data-source';
import { setupEmailWorker } from './modules/mailer/workers/email.worker';
import { emailQueue } from './modules/mailer/queues/email.queue';
import { buildApp } from './app';

async function bootstrap() {
  const port = Number(process.env.PORT) || 3333;
  const host = '0.0.0.0';

  console.log('🚀 Inicializando o Mailer Service...');

  // 1. Conexão com o PostgreSQL
  await AppDataSource.initialize();
  console.log('📦 Conexão com PostgreSQL estabelecida com sucesso.');

  // 2. Inicialização do Worker em segundo plano
  const worker = setupEmailWorker();
  console.log('⚙️  BullMQ Worker ativo e processando filas.');

  // 3. Inicialização do Servidor Fastify
  const app = buildApp();

  await app.listen({ port, host });
  console.log(`🌐 API HTTP rodando em http://localhost:${port}`);
  console.log(`🩺 Healthcheck disponível em http://localhost:${port}/health`);

  // 4. Graceful Shutdown (Encerramento gracioso em caso de parada do container/processo)
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Sinal ${signal} recebido. Encerrando serviços com segurança...`);
    try {
      await app.close();
      console.log('🔌 Servidor HTTP encerrado.');

      await worker.close();
      console.log('⚙️  Worker encerrado.');

      await emailQueue.close();
      console.log('📥 Conexão com fila encerrada.');

      await AppDataSource.destroy();
      console.log('📦 Conexão com PostgreSQL encerrada.');

      console.log('👋 Processo finalizado com sucesso.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro durante o encerramento gracioso:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('❌ Falha crítica ao inicializar a aplicação:', error);
  process.exit(1);
});

