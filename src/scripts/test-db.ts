import { AppDataSource } from '../database/data-source';

async function testConnection() {
  try {
    console.log('Conectando ao banco de dados PostgreSQL...');
    await AppDataSource.initialize();
    console.log('✅ Banco de dados conectado com sucesso!');

    const emailRepo = AppDataSource.getRepository('EmailJob');
    const count = await emailRepo.count();
    console.log(`✅ Tabela 'emails' sincronizada e pronta! Total de registros: ${count}`);

    await AppDataSource.destroy();
    console.log('Conexão encerrada com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

testConnection();

