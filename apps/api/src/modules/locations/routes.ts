import { Type } from 'typebox';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  IdParamsSchema,
  LocationInputSchema,
  LocationSchema,
  LocationListSchema,
  LocationAuthorizationInputSchema,
  LocationAuthorizationSchema,
  LocationAuthorizationListSchema,
  GeoCheckInputSchema,
  GeoCheckSchema,
} from '@asistencia/contracts';
import type { AccessControl } from '../identity/index.js';
import { LocationError } from './domain/geofence.js';
import type { LocationService } from './service.js';
export function registerLocationRoutes(
  app: FastifyInstance,
  service: LocationService,
  access: AccessControl,
): void {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.setErrorHandler((error, request, reply) => {
      if (!(error instanceof LocationError)) throw error;
      return reply
        .code(
          error.code.endsWith('NOT_FOUND')
            ? 404
            : error.code === 'LOCATION_IN_USE'
              ? 409
              : 400,
        )
        .send({
          error: {
            code: error.code,
            message: error.message,
            requestId: request.id,
          },
        });
    });
    const locationView = (
      row: Awaited<ReturnType<LocationService['create']>>,
    ) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    const authorizationView = (
      row: Awaited<ReturnType<LocationService['authorize']>>,
    ) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
    });
    routes.get(
      '/api/locations',
      {
        schema: {
          tags: ['Ubicaciones'],
          response: { 200: LocationListSchema },
        },
      },
      async (request) => ({
        items: (await service.list(await access.actor(request))).map(
          locationView,
        ),
      }),
    );
    routes.post(
      '/api/locations',
      {
        schema: {
          tags: ['Ubicaciones'],
          body: LocationInputSchema,
          response: { 201: LocationSchema },
        },
      },
      async (request, reply) => {
        const actor = await access.management(request, true);
        return reply
          .code(201)
          .send(
            locationView(await service.create(request.body, actor.user.id)),
          );
      },
    );
    routes.put(
      '/api/locations/:id',
      {
        schema: {
          tags: ['Ubicaciones'],
          params: IdParamsSchema,
          body: LocationInputSchema,
          response: { 200: LocationSchema },
        },
      },
      async (request) => {
        const actor = await access.management(request, true);
        return locationView(
          await service.update(request.params.id, request.body, actor.user.id),
        );
      },
    );
    routes.delete(
      '/api/locations/:id',
      {
        schema: {
          tags: ['Ubicaciones'],
          params: IdParamsSchema,
          response: { 204: Type.Null() },
        },
      },
      async (request, reply) => {
        const actor = await access.management(request, true);
        await service.delete(request.params.id, actor.user.id);
        return reply.code(204).send(null);
      },
    );
    routes.get(
      '/api/location-authorizations',
      {
        schema: {
          tags: ['Ubicaciones'],
          response: { 200: LocationAuthorizationListSchema },
        },
      },
      async (request) => ({
        items: (
          await service.listAuthorizations(await access.actor(request))
        ).map(authorizationView),
      }),
    );
    routes.post(
      '/api/location-authorizations',
      {
        schema: {
          tags: ['Ubicaciones'],
          body: LocationAuthorizationInputSchema,
          response: { 201: LocationAuthorizationSchema },
        },
      },
      async (request, reply) => {
        const actor = await access.management(request, true);
        return reply
          .code(201)
          .send(
            authorizationView(
              await service.authorize(request.body, actor.user.id),
            ),
          );
      },
    );
    routes.delete(
      '/api/location-authorizations/:id',
      {
        schema: {
          tags: ['Ubicaciones'],
          params: IdParamsSchema,
          response: { 204: Type.Null() },
        },
      },
      async (request, reply) => {
        const actor = await access.management(request, true);
        await service.revoke(request.params.id, actor.user.id);
        return reply.code(204).send(null);
      },
    );
    routes.post(
      '/api/locations/validate',
      {
        schema: {
          tags: ['Ubicaciones'],
          body: GeoCheckInputSchema,
          response: { 200: GeoCheckSchema },
        },
      },
      async (request) => {
        const actor = await access.mutation(request);
        const row = await service.validate(request.body, actor);
        return { ...row, checkedAt: row.checkedAt.toISOString() };
      },
    );
  });
}
