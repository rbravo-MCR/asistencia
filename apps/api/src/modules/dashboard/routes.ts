import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  DashboardSchema,
  ConfigurationStatusSchema,
  ErrorSchema,
} from '@asistencia/contracts';
import type { AccessControl } from '../identity/index.js';
import type { DashboardService } from './service.js';
export function registerDashboardRoutes(
  app: FastifyInstance,
  service: DashboardService,
  access: AccessControl,
) {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_req, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.get(
      '/api/dashboard',
      {
        schema: {
          tags: ['Inicio'],
          response: { 200: DashboardSchema, 401: ErrorSchema },
        },
      },
      async (request) => service.get(await access.actor(request)),
    );
    routes.get(
      '/api/configuration/status',
      {
        schema: {
          tags: ['Configuración'],
          response: {
            200: ConfigurationStatusSchema,
            401: ErrorSchema,
            403: ErrorSchema,
          },
        },
      },
      async (request) =>
        service.configuration(await access.management(request)),
    );
  });
}
