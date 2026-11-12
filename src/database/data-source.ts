import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { EmailJob } from './entities/EmailJob';
import { ApiKey } from './entities/ApiKey';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'mailer_user',
  password: process.env.DB_PASSWORD || 'mailer_password',
  database: process.env.DB_NAME || 'mailer_db',
  
  // Em desenvolvimento, o synchronize sincroniza automaticamente as tabelas
  // No fluxo Full Cycle de producao, usamos migrations
  synchronize: process.env.NODE_ENV === 'development',
  // Loga apenas erros de SQL para nao poluir o terminal com queries internas de schema
  logging: ['error'],
  entities: [EmailJob, ApiKey],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  subscribers: []
});
