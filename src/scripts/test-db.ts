import { AppDataSource } from '../database/data-source';

async function testConnection() {
  try {
    console.log('[INFO] Conectando ao banco de dados PostgreSQL...');
    await AppDataSource.initialize();
    console.log('[INFO] Banco de dados conectado com sucesso.');

    const emailRepo = AppDataSource.getRepository('EmailJob');
    const count = await emailRepo.count();
    console.log(`[INFO] Tabela 'emails' sincronizada e pronta. Total de registros: ${count}`);

    await AppDataSource.destroy();
    console.log('[INFO] Conexao encerrada com sucesso.');
  } catch (error) {
    console.error('[ERROR] Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

testConnection();
