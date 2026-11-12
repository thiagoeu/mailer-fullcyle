/**
 * Mensagens padronizadas de retorno e respostas da API
 */
export const MessagesConstants = {
  EMAIL_ENQUEUED_SUCCESS: 'E-mail enfileirado com sucesso para processamento em segundo plano.',
  EMAIL_IDEMPOTENCY_DETECTED: 'E-mail previamente registrado (Idempotencia acionada).',
  EMAIL_NOT_FOUND: 'Nenhum e-mail encontrado com o identificador fornecido.',
  INVALID_PAYLOAD: 'Dados de envio invalidos.',
  
  // Headers HTTP
  HEADER_IDEMPOTENCY_KEY: 'idempotency-key',
  HEADER_X_IDEMPOTENCY_KEY: 'x-idempotency-key',
} as const;

