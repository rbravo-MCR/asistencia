import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import {
  AuditEventListSchema,
  AuditQuerySchema,
  NotificationListSchema,
  IdParamsSchema,
  ErrorSchema,
} from '@asistencia/contracts';
import type { SessionView } from '@asistencia/contracts';
import type { FastifyRequest } from 'fastify';
interface AccessControl {
  actor(request: FastifyRequest): Promise<SessionView>;
  mutation(request: FastifyRequest): Promise<SessionView>;
  admin(request: FastifyRequest): Promise<SessionView>;
}
import type { AuditService } from '../application/service.js';
import { HttpError } from '../../../infrastructure/http/errors.js';
export function registerAuditRoutes(
  app: FastifyInstance,
  service: AuditService,
  access: AccessControl,
) {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.get(
      '/api/audit-events',
      {
        schema: {
          tags: ['Auditoría'],
          querystring: AuditQuerySchema,
          response: { 200: AuditEventListSchema },
        },
      },
      async (request) => {
        await access.admin(request);
        return service.list({
          limit: Number(request.query.limit ?? 50),
          offset: Number(request.query.offset ?? 0),
          ...(request.query.entityType
            ? { entityType: request.query.entityType }
            : {}),
          ...(request.query.action ? { action: request.query.action } : {}),
        });
      },
    );
    routes.get(
      '/api/notifications',
      {
        schema: { tags: ['Avisos'], response: { 200: NotificationListSchema } },
      },
      async (request) => service.inbox((await access.actor(request)).user.id),
    );
    routes.post(
      '/api/notifications/read-all',
      { schema: { tags: ['Avisos'], response: { 204: Type.Null() } } },
      async (request, reply) => {
        await service.read((await access.mutation(request)).user.id);
        return reply.code(204).send(null);
      },
    );
    routes.post(
      '/api/notifications/:id/read',
      {
        schema: {
          tags: ['Avisos'],
          params: IdParamsSchema,
          response: { 204: Type.Null(), 404: ErrorSchema },
        },
      },
      async (request, reply) => {
        if (
          !(await service.read(
            (await access.mutation(request)).user.id,
            request.params.id,
          ))
        )
          throw new HttpError(
            404,
            'NOTIFICATION_NOT_FOUND',
            'Aviso no encontrado.',
          );
        return reply.code(204).send(null);
      },
    );
  });
}
