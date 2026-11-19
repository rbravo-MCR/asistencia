import { Type } from 'typebox';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  ShiftTemplateInputSchema,
  ShiftTemplateSchema,
  ShiftTemplateListSchema,
  HolidayInputSchema,
  HolidaySchema,
  HolidayListSchema,
  ScheduleAssignmentInputSchema,
  ScheduleAssignmentSchema,
  ScheduleAssignmentListSchema,
  CalendarQuerySchema,
  CancelScheduleAssignmentSchema,
  IdParamsSchema,
} from '@asistencia/contracts';
import type { AccessControl } from '../../identity/index.js';
import type { PlanningService } from '../application/service.js';
import { PlanningError } from '../domain/planning.js';
export function registerPlanningRoutes(
  app: FastifyInstance,
  service: PlanningService,
  access: AccessControl,
): void {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.setErrorHandler((error, request, reply) => {
      if (!(error instanceof PlanningError)) throw error;
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
        },
      });
    });
    const slotView = (
      row: Awaited<ReturnType<PlanningService['saveAssignment']>>,
    ) => ({
      ...row,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
    });
    routes.get(
      '/api/shift-templates',
      {
        schema: {
          tags: ['Planificación'],
          response: { 200: ShiftTemplateListSchema },
        },
      },
      async (request) => {
        await access.actor(request);
        return { items: await service.listTemplates() };
      },
    );
    routes.post(
      '/api/shift-templates',
      {
        schema: {
          tags: ['Planificación'],
          body: ShiftTemplateInputSchema,
          response: { 201: ShiftTemplateSchema },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        return reply.code(201).send(await service.saveTemplate(request.body));
      },
    );
    routes.put(
      '/api/shift-templates/:id',
      {
        schema: {
          tags: ['Planificación'],
          params: IdParamsSchema,
          body: ShiftTemplateInputSchema,
          response: { 200: ShiftTemplateSchema },
        },
      },
      async (request) => {
        await access.management(request, true);
        return service.saveTemplate(request.body, request.params.id);
      },
    );
    routes.delete(
      '/api/shift-templates/:id',
      {
        schema: {
          tags: ['Planificación'],
          params: IdParamsSchema,
          response: { 204: Type.Null() },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        await service.deleteTemplate(request.params.id);
        return reply.code(204).send(null);
      },
    );
    routes.get(
      '/api/holidays',
      {
        schema: {
          tags: ['Planificación'],
          response: { 200: HolidayListSchema },
        },
      },
      async (request) => {
        await access.actor(request);
        return { items: await service.listHolidays() };
      },
    );
    routes.post(
      '/api/holidays',
      {
        schema: {
          tags: ['Planificación'],
          body: HolidayInputSchema,
          response: { 201: HolidaySchema },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        return reply.code(201).send(await service.saveHoliday(request.body));
      },
    );
    routes.put(
      '/api/holidays/:id',
      {
        schema: {
          tags: ['Planificación'],
          params: IdParamsSchema,
          body: HolidayInputSchema,
          response: { 200: HolidaySchema },
        },
      },
      async (request) => {
        await access.management(request, true);
        return service.saveHoliday(request.body, request.params.id);
      },
    );
    routes.delete(
      '/api/holidays/:id',
      {
        schema: {
          tags: ['Planificación'],
          params: IdParamsSchema,
          response: { 204: Type.Null() },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        await service.deleteHoliday(request.params.id);
        return reply.code(204).send(null);
      },
    );
    routes.get(
      '/api/schedule-assignments',
      {
        schema: {
          tags: ['Planificación'],
          querystring: CalendarQuerySchema,
          response: { 200: ScheduleAssignmentListSchema },
        },
      },
      async (request) => ({
        items: (
          await service.listAssignments(
            request.query.from,
            request.query.to,
            await access.actor(request),
          )
        ).map(slotView),
      }),
    );
    routes.post(
      '/api/schedule-assignments',
      {
        schema: {
          tags: ['Planificación'],
          body: ScheduleAssignmentInputSchema,
          response: { 201: ScheduleAssignmentSchema },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        return reply
          .code(201)
          .send(slotView(await service.saveAssignment(request.body)));
      },
    );
    routes.put(
      '/api/schedule-assignments/:id',
      {
        schema: {
          tags: ['Planificación'],
          params: IdParamsSchema,
          body: ScheduleAssignmentInputSchema,
          response: { 200: ScheduleAssignmentSchema },
        },
      },
      async (request) => {
        await access.management(request, true);
        return slotView(
          await service.saveAssignment(request.body, request.params.id),
        );
      },
    );
    routes.post(
      '/api/schedule-assignments/:id/publish',
      {
        schema: {
          tags: ['Planificación'],
          params: IdParamsSchema,
          response: { 200: ScheduleAssignmentSchema },
        },
      },
      async (request) => {
        await access.management(request, true);
        return slotView(await service.publishAssignment(request.params.id));
      },
    );
    routes.post(
      '/api/schedule-assignments/:id/cancel',
      {
        schema: {
          tags: ['Planificación'],
          params: IdParamsSchema,
          body: CancelScheduleAssignmentSchema,
          response: { 200: ScheduleAssignmentSchema },
        },
      },
      async (request) => {
        await access.management(request, true);
        return slotView(
          await service.cancelAssignment(
            request.params.id,
            request.body.reason,
          ),
        );
      },
    );
  });
}
