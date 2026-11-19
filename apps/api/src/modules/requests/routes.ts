import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import {
  CreateRequestSchema,
  IdParamsSchema,
  LeaveConfigurationSchema,
  LeavePolicyInputSchema,
  LeavePolicySchema,
  LeaveRequestListSchema,
  LeaveRequestSchema,
  PermissionTypeInputSchema,
  PermissionTypeSchema,
  RequestDecisionInputSchema,
  RequestWithdrawInputSchema,
  VacationAdjustmentInputSchema,
  VacationBalanceListSchema,
  VacationBalanceSchema,
  VacationGrantInputSchema,
} from '@asistencia/contracts';
import type { AccessControl } from '../identity/index.js';
import type { RequestService } from './service.js';
import { RequestError } from './domain/leave.js';
export function registerRequestRoutes(
  app: FastifyInstance,
  service: RequestService,
  access: AccessControl,
) {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.setErrorHandler((error, request, reply) => {
      if (!(error instanceof RequestError)) throw error;
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
        },
      });
    });
    routes.get(
      '/api/leave/configuration',
      { schema: { response: { 200: LeaveConfigurationSchema } } },
      async (request) => {
        await access.actor(request);
        return service.configuration();
      },
    );
    routes.put(
      '/api/leave/policy',
      {
        schema: {
          body: LeavePolicyInputSchema,
          response: { 200: LeavePolicySchema },
        },
      },
      async (request) =>
        service.savePolicy(
          request.body,
          await access.management(request, true),
        ),
    );
    routes.post(
      '/api/leave/permission-types',
      {
        schema: {
          body: PermissionTypeInputSchema,
          response: { 200: PermissionTypeSchema },
        },
      },
      async (request) =>
        service.savePermissionType(
          undefined,
          request.body,
          await access.management(request, true),
        ),
    );
    routes.put(
      '/api/leave/permission-types/:id',
      {
        schema: {
          params: IdParamsSchema,
          body: PermissionTypeInputSchema,
          response: { 200: PermissionTypeSchema },
        },
      },
      async (request) =>
        service.savePermissionType(
          request.params.id,
          request.body,
          await access.management(request, true),
        ),
    );
    routes.get(
      '/api/requests',
      { schema: { response: { 200: LeaveRequestListSchema } } },
      async (request) => ({
        items: await service.list(await access.actor(request)),
      }),
    );
    routes.post(
      '/api/requests',
      {
        bodyLimit: 5 * 1024 * 1024,
        schema: {
          body: CreateRequestSchema,
          response: { 200: LeaveRequestSchema },
        },
      },
      async (request) =>
        service.create(request.body, await access.mutation(request)),
    );
    routes.post(
      '/api/requests/:id/decision',
      {
        schema: {
          params: IdParamsSchema,
          body: RequestDecisionInputSchema,
          response: { 200: LeaveRequestSchema },
        },
      },
      async (request) =>
        service.decide(
          request.params.id,
          request.body,
          await access.mutation(request),
        ),
    );
    routes.post(
      '/api/requests/:id/withdraw',
      {
        schema: {
          params: IdParamsSchema,
          body: RequestWithdrawInputSchema,
          response: { 200: LeaveRequestSchema },
        },
      },
      async (request) =>
        service.withdraw(
          request.params.id,
          request.body,
          await access.mutation(request),
        ),
    );
    routes.get(
      '/api/requests/:id/evidence/:evidenceId',
      {
        schema: {
          params: Type.Object(
            {
              id: Type.String({ format: 'uuid' }),
              evidenceId: Type.String({ format: 'uuid' }),
            },
            { additionalProperties: false },
          ),
        },
      },
      async (request, reply) => {
        const f = await service.evidence(
          request.params.id,
          request.params.evidenceId,
          await access.actor(request),
        );
        return reply
          .type(f.mimeType)
          .header('x-content-type-options', 'nosniff')
          .header(
            'content-disposition',
            `attachment; filename="evidencia"; filename*=UTF-8''${encodeURIComponent(f.filename).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
          )
          .send(f.content);
      },
    );
    routes.get(
      '/api/vacation/balances',
      { schema: { response: { 200: VacationBalanceListSchema } } },
      async (request) => ({
        items: await service.balances(await access.actor(request)),
      }),
    );
    routes.post(
      '/api/vacation/grants',
      {
        schema: {
          body: VacationGrantInputSchema,
          response: { 200: VacationBalanceSchema },
        },
      },
      async (request) =>
        service.grant(request.body, await access.management(request, true)),
    );
    routes.post(
      '/api/vacation/adjustments',
      {
        schema: {
          body: VacationAdjustmentInputSchema,
          response: { 200: VacationBalanceSchema },
        },
      },
      async (request) =>
        service.adjust(request.body, await access.management(request, true)),
    );
  });
}
