import { Type } from 'typebox';
import type { AccessControl } from '../../identity/index.js';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  CreateDepartmentSchema,
  IdParamsSchema,
  DepartmentSchema,
  DepartmentListSchema,
  ErrorSchema,
  type DepartmentResponse,
} from '@asistencia/contracts';
import {
  createDepartment,
  listDepartments,
  updateDepartment,
  deleteDepartment,
} from '../application/use-cases.js';
import {
  DepartmentNameAlreadyExistsError,
  DepartmentNotFoundError,
  DepartmentInUseError,
  InvalidDepartmentNameError,
  type Department,
  type DepartmentRepository,
} from '../domain/department.js';

function serializeDepartment(department: Department): DepartmentResponse {
  return {
    id: department.id,
    name: department.name,
    createdAt: department.createdAt.toISOString(),
  };
}

export function registerDepartmentRoutes(
  app: FastifyInstance,
  repository: DepartmentRepository,
  access: AccessControl,
): void {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.setErrorHandler((error, request, reply) => {
      if (
        error instanceof InvalidDepartmentNameError ||
        error instanceof DepartmentNameAlreadyExistsError
      ) {
        const duplicate = error instanceof DepartmentNameAlreadyExistsError;
        return reply.code(duplicate ? 409 : 400).send({
          error: {
            code: duplicate
              ? 'DEPARTMENT_NAME_EXISTS'
              : 'INVALID_DEPARTMENT_NAME',
            message: error.message,
            requestId: request.id,
          },
        });
      }
      if (
        error instanceof DepartmentNotFoundError ||
        error instanceof DepartmentInUseError
      ) {
        const missing = error instanceof DepartmentNotFoundError;
        return reply.code(missing ? 404 : 409).send({
          error: {
            code: missing ? 'DEPARTMENT_NOT_FOUND' : 'DEPARTMENT_IN_USE',
            message: error.message,
            requestId: request.id,
          },
        });
      }
      // Fastify delega al handler padre los errores de validación e infraestructura.
      throw error;
    });
    routes.get(
      '/api/departments',
      {
        schema: {
          tags: ['Departamentos'],
          summary: 'Consultar departamentos',
          response: { 200: DepartmentListSchema, 500: ErrorSchema },
        },
      },
      async (request) => {
        const actor = await access.actor(request);
        return {
          items: (
            await listDepartments(
              repository,
              actor.permissions.viewAllEmployees
                ? undefined
                : actor.departmentIds,
            )
          ).map(serializeDepartment),
        };
      },
    );
    routes.post(
      '/api/departments',
      {
        schema: {
          tags: ['Departamentos'],
          summary: 'Crear departamento',
          body: CreateDepartmentSchema,
          response: {
            201: DepartmentSchema,
            400: ErrorSchema,
            409: ErrorSchema,
            415: ErrorSchema,
            500: ErrorSchema,
          },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        const department = await createDepartment(repository, request.body);
        return reply.code(201).send(serializeDepartment(department));
      },
    );
    routes.put(
      '/api/departments/:id',
      {
        schema: {
          tags: ['Departamentos'],
          summary: 'Editar departamento',
          params: IdParamsSchema,
          body: CreateDepartmentSchema,
          response: {
            200: DepartmentSchema,
            400: ErrorSchema,
            401: ErrorSchema,
            403: ErrorSchema,
            404: ErrorSchema,
            409: ErrorSchema,
            500: ErrorSchema,
          },
        },
      },
      async (request) => {
        await access.management(request, true);
        return serializeDepartment(
          await updateDepartment(repository, request.params.id, request.body),
        );
      },
    );
    routes.delete(
      '/api/departments/:id',
      {
        schema: {
          tags: ['Departamentos'],
          summary: 'Eliminar departamento sin referencias',
          params: IdParamsSchema,
          response: {
            204: Type.Null(),
            400: ErrorSchema,
            401: ErrorSchema,
            403: ErrorSchema,
            404: ErrorSchema,
            409: ErrorSchema,
            500: ErrorSchema,
          },
        },
      },
      async (request, reply) => {
        await access.management(request, true);
        await deleteDepartment(repository, request.params.id);
        return reply.code(204).send(null);
      },
    );
  });
}
