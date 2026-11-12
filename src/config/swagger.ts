import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export const swaggerOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    info: {
      title: 'Mailer Service — Full Cycle API',
      description: 'API REST assincrona para enfileiramento e processamento resiliente de e-mails com BullMQ, TypeORM, Nodemailer e Observabilidade.',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3333',
        description: 'Servidor Local de Desenvolvimento',
      },
    ],
    tags: [
      { name: 'Emails', description: 'Operacoes de enfileiramento e consulta de e-mails' },
      { name: 'Monitoramento', description: 'Endpoints de saude e observabilidade' },
    ],
  },
  transform: jsonSchemaTransform,
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
};

