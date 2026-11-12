/**
 * Metadados e informacoes da documentacao OpenAPI / Swagger
 */
export const SwaggerConstants = {
  TITLE: 'Mailer Service — Full Cycle API',
  DESCRIPTION: 'API REST assincrona para enfileiramento e processamento resiliente de e-mails com BullMQ, TypeORM, Nodemailer e Observabilidade.',
  VERSION: '1.0.0',
  ROUTE_PREFIX: '/docs',
  
  TAG_EMAILS: 'Emails',
  TAG_MONITORING: 'Monitoramento',
  
  TAG_EMAILS_DESCRIPTION: 'Operacoes de enfileiramento e consulta de e-mails',
  TAG_MONITORING_DESCRIPTION: 'Endpoints de saude e observabilidade',
} as const;

