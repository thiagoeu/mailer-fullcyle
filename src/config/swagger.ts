import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { SwaggerConstants } from '../shared/constants/swagger.constants';

export const swaggerOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    info: {
      title: SwaggerConstants.TITLE,
      description: SwaggerConstants.DESCRIPTION,
      version: SwaggerConstants.VERSION,
    },
    servers: [
      {
        url: 'http://localhost:3333',
        description: 'Servidor Local de Desenvolvimento',
      },
    ],
    tags: [
      { name: SwaggerConstants.TAG_EMAILS, description: SwaggerConstants.TAG_EMAILS_DESCRIPTION },
      { name: 'API Keys', description: 'Gerenciamento de chaves de autenticacao com hashing SHA-256' },
      { name: SwaggerConstants.TAG_MONITORING, description: SwaggerConstants.TAG_MONITORING_DESCRIPTION },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'Chave secreta de autenticacao para consumo das rotas /emails (padrao: default_secret_key)',
        },
        AdminKeyAuth: {
          type: 'apiKey',
          name: 'x-admin-key',
          in: 'header',
          description: 'Chave mestre administrativa para gerenciamento de API Keys (padrao: master_admin_secret)',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: SwaggerConstants.ROUTE_PREFIX,
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
};
