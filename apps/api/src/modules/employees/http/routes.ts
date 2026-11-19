import { Type } from 'typebox';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  ErrorSchema,
  EmployeeInputSchema,
  EmployeeCreateInputSchema,
  EmployeeSchema,
  EmployeeListSchema,
  AssignmentInputSchema,
  AssignmentSchema,
  AssignmentListSchema,
  IdParamsSchema,
} from '@asistencia/contracts';
import { IdentityError, type AccessControl } from '../../identity/index.js';
import { OrganizationError } from '../domain/employee.js';
import type { EmployeeService } from '../application/service.js';

export function registerEmployeeRoutes(
  app: FastifyInstance,
  organization: EmployeeService,
  access: AccessControl,
): void {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.setErrorHandler((error, request, reply) => {
      if (
        !(error instanceof OrganizationError) &&
        !(error instanceof IdentityError)
      )
        throw error;
      const status = error.code.endsWith('NOT_FOUND')
        ? 404
        : error.code.endsWith('CONFLICT') ||
            error.code === 'LAST_ADMIN' ||
            error.code === 'LAST_SUPER_ADMIN' ||
            error.code === 'EMPLOYEE_IN_USE'
          ? 409
          : ['SUPER_ADMIN_REQUIRED', 'USER_MANAGEMENT_REQUIRED'].includes(
                error.code,
              )
            ? 403
            : 400;
      return reply.code(status).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
        },
      });
    });
    const employeeView = (
      row: Awaited<ReturnType<EmployeeService['create']>>,
    ) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    const assignmentView = (
      row: Awaited<ReturnType<EmployeeService['assign']>>,
    ) => ({
      ...row,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
    });
    routes.get(
      '/api/employees',
      {
        schema: { tags: ['Empleados'], response: { 200: EmployeeListSchema } },
      },
      async (request) => ({
        items: (await organization.list(await access.actor(request))).map(
          employeeView,
        ),
      }),
    );
    routes.get(
      '/api/employees/:id',
      {
        schema: {
          tags: ['Empleados'],
          params: IdParamsSchema,
          response: { 200: EmployeeSchema },
        },
      },
      async (request) =>
        employeeView(
          await organization.get(
            request.params.id,
            await access.actor(request),
          ),
        ),
    );
    routes.post(
      '/api/employees',
      {
        schema: {
          tags: ['Empleados'],
          body: EmployeeCreateInputSchema,
          response: { 201: EmployeeSchema },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        return reply
          .code(201)
          .send(employeeView(await organization.create(request.body)));
      },
    );
    routes.put(
      '/api/employees/:id',
      {
        schema: {
          tags: ['Empleados'],
          params: IdParamsSchema,
          body: EmployeeInputSchema,
          response: { 200: EmployeeSchema },
        },
      },
      async (request) => {
        await access.management(request, true);
        return employeeView(
          await organization.update(request.params.id, request.body),
        );
      },
    );
    routes.delete(
      '/api/employees/:id',
      {
        schema: {
          tags: ['Empleados'],
          summary: 'Eliminar expediente sin historial ni subordinados',
          params: IdParamsSchema,
          response: {
            204: Type.Null(),
            400: ErrorSchema,
            401: ErrorSchema,
            403: ErrorSchema,
            404: ErrorSchema,
            409: ErrorSchema,
          },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        await organization.delete(request.params.id);
        return reply.code(204).send(null);
      },
    );
    routes.get(
      '/api/assignments',
      {
        schema: {
          tags: ['Responsables'],
          response: { 200: AssignmentListSchema },
        },
      },
      async (request) => ({
        items: (
          await organization.listAssignments(await access.actor(request))
        ).map(assignmentView),
      }),
    );
    routes.post(
      '/api/assignments',
      {
        schema: {
          tags: ['Responsables'],
          body: AssignmentInputSchema,
          response: { 201: AssignmentSchema },
        },
      },
      async (request, reply) => {
        const actor = await access.management(request, true);
        return reply
          .code(201)
          .send(
            assignmentView(
              await organization.assign(request.body, actor.user.id),
            ),
          );
      },
    );
    routes.delete(
      '/api/assignments/:id',
      { schema: { tags: ['Responsables'], params: IdParamsSchema } },
      async (request, reply) => {
        await access.management(request, true);
        await organization.revokeAssignment(request.params.id);
        return reply.code(204).send(null);
      },
    );
  });
}
