import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ApiKeyController } from '../controllers/api-key.controller';
import {
  createApiKeyRouteSchema,
  listApiKeysRouteSchema,
  revokeApiKeyRouteSchema,
} from '../schemas/api-key.schema';
import { adminAuthMiddleware } from '../../../shared/middleware/auth.middleware';

export async function apiKeyRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  const controller = new ApiKeyController();

  // Protege todos os endpoints de gerenciamento de chaves com a Master Key
  app.addHook('preHandler', adminAuthMiddleware);

  typedApp.post('/', { schema: createApiKeyRouteSchema }, controller.create.bind(controller));
  typedApp.get('/', { schema: listApiKeysRouteSchema }, controller.list.bind(controller));
  typedApp.patch('/:id/revoke', { schema: revokeApiKeyRouteSchema }, controller.revoke.bind(controller));
}
