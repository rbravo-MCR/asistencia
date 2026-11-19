import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  AttendancePolicySchema,
  AttendancePolicyInputSchema,
  AttendanceRangeSchema,
  AttendancePunchInputSchema,
  AttendancePunchResultSchema,
  AttendanceSummarySchema,
  AttendanceIncidentListSchema,
  AttendanceReasonInputSchema,
  AttendanceIncidentSchema,
  AttendanceEvaluateResultSchema,
  AttendanceMeSchema,
  IdParamsSchema,
} from '@asistencia/contracts';
import type { AccessControl } from '../identity/index.js';
import type { AttendanceService } from './service.js';
import { AttendanceError } from './domain.js';
export function registerAttendanceRoutes(
  app: FastifyInstance,
  service: AttendanceService,
  access: AccessControl,
): void {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.setErrorHandler((error, request, reply) => {
      if (!(error instanceof AttendanceError)) throw error;
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
        },
      });
    });
    routes.get(
      '/api/attendance/policy',
      { schema: { response: { 200: AttendancePolicySchema } } },
      async (request) => {
        await access.actor(request);
        return service.policy();
      },
    );
    routes.put(
      '/api/attendance/policy',
      {
        schema: {
          body: AttendancePolicyInputSchema,
          response: { 200: AttendancePolicySchema },
        },
      },
      async (request) => {
        const actor = await access.management(request, true);
        return service.updatePolicy(request.body, actor.user.id);
      },
    );
    routes.get(
      '/api/attendance/me',
      { schema: { response: { 200: AttendanceMeSchema } } },
      async (request) => service.me(await access.actor(request)),
    );
    routes.post(
      '/api/attendance/punches',
      {
        schema: {
          body: AttendancePunchInputSchema,
          response: { 200: AttendancePunchResultSchema },
        },
      },
      async (request) =>
        service.punch(request.body, await access.mutation(request)),
    );
    routes.get(
      '/api/attendance/summary',
      {
        schema: {
          querystring: AttendanceRangeSchema,
          response: { 200: AttendanceSummarySchema },
        },
      },
      async (request) => ({
        items: await service.summary(
          request.query.from,
          request.query.to,
          await access.actor(request),
        ),
      }),
    );
    routes.get(
      '/api/attendance/incidents',
      {
        schema: {
          querystring: AttendanceRangeSchema,
          response: { 200: AttendanceIncidentListSchema },
        },
      },
      async (request) => ({
        items: await service.incidents(
          request.query.from,
          request.query.to,
          await access.actor(request),
        ),
      }),
    );
    routes.post(
      '/api/attendance/incidents/:id/reason',
      {
        schema: {
          params: IdParamsSchema,
          body: AttendanceReasonInputSchema,
          response: { 200: AttendanceIncidentSchema },
        },
      },
      async (request) =>
        service.reason(
          request.params.id,
          request.body.reason,
          await access.mutation(request),
        ),
    );
    routes.post(
      '/api/attendance/evaluate',
      {
        schema: {
          body: AttendanceRangeSchema,
          response: { 200: AttendanceEvaluateResultSchema },
        },
      },
      async (request) => {
        const actor = await access.management(request, true);
        return service.evaluate(
          request.body.from,
          request.body.to,
          actor.user.id,
        );
      },
    );
  });
}
