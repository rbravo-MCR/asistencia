import {
  createDashboardService,
  registerDashboardRoutes,
} from '../modules/dashboard/index.js';
import {
  createAttendanceService,
  registerAttendanceRoutes,
} from '../modules/attendance/index.js';
import {
  createRequestService,
  registerRequestRoutes,
} from '../modules/requests/index.js';
import {
  createPlanningService,
  registerPlanningRoutes,
} from '../modules/planning/index.js';
import {
  createLocationService,
  registerLocationRoutes,
} from '../modules/locations/index.js';
import {
  withAuditContext,
  createAuditService,
  registerAuditRoutes,
  dispatchNotifications,
} from '../modules/audit/index.js';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { HttpError } from '../infrastructure/http/errors.js';
import {
  createIdentityService,
  createAccessControl,
  registerIdentityRoutes,
} from '../modules/identity/index.js';
import {
  createEmployeeService,
  registerEmployeeRoutes,
} from '../modules/employees/index.js';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { sql } from 'drizzle-orm';
import {
  ErrorSchema,
  LivenessSchema,
  ReadinessSchema,
  UnavailableSchema,
} from '@asistencia/contracts';
import { createDatabase } from '../infrastructure/database/client.js';
import type { Config } from './config.js';
import {
  createDepartmentRepository,
  registerDepartmentRoutes,
} from '../modules/departments/index.js';

export function buildApp(config: Config) {
  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
        coerceTypes: false,
        useDefaults: false,
      },
    },
    logger: {
      level: config.logLevel,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.token',
        'req.headers["x-csrf-token"]',
      ],
    },
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    bodyLimit: 1048576,
    requestTimeout: 10000,
    trustProxy: false,
  }).withTypeProvider<TypeBoxTypeProvider>();
  app.addHook('onRequest', (request, _reply, done) =>
    withAuditContext({ requestId: request.id, actorId: null }, done),
  );
  const database = createDatabase(config.databaseUrl);
  app.addHook('onClose', async () => {
    await database.pool.end();
  });
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  app.register(helmet);
  app.register(cookie);
  app.register(rateLimit, {
    global: false,
    hook: 'preHandler',
    errorResponseBuilder: () =>
      new HttpError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos. Intenta de nuevo más tarde.',
      ),
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Recurso no encontrado.',
        requestId: request.id,
      },
    }),
  );
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError)
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
        },
      });
    const invalid =
      error instanceof Error &&
      'validation' in error &&
      Boolean(error.validation);
    const statusCode =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    const status = invalid
      ? 400
      : statusCode >= 400 && statusCode < 500
        ? statusCode
        : 500;
    if (status >= 500)
      request.log.error(
        { code: 'INTERNAL_ERROR', requestId: request.id },
        'Error interno de la solicitud.',
      );
    return reply.code(status).send({
      error: {
        code: invalid
          ? 'VALIDATION_ERROR'
          : status >= 500
            ? 'INTERNAL_ERROR'
            : 'REQUEST_ERROR',
        message: invalid
          ? 'Datos de entrada inválidos.'
          : status >= 500
            ? 'No se pudo completar la solicitud.'
            : 'Solicitud inválida.',
        requestId: request.id,
      },
    });
  });
  if (config.nodeEnv !== 'production') {
    app.register(swagger, {
      openapi: { info: { title: 'Asistencia API', version: '0.1.0' } },
    });
    app.register(swaggerUi, { routePrefix: '/docs', staticCSP: true });
  }
  const identity = createIdentityService(database.db, {
    sessionHours: config.sessionHours,
  });
  const organization = createEmployeeService(database.db);
  const attendance = createAttendanceService(database.db);
  const access = createAccessControl(
    identity,
    (id) => organization.scopeFor(id),
    config.appOrigin,
    config.nodeEnv === 'development',
  );
  registerIdentityRoutes(
    app,
    identity,
    access,
    config.nodeEnv === 'production',
    config.sessionHours,
  );
  registerEmployeeRoutes(app, organization, access);
  registerDashboardRoutes(
    app,
    createDashboardService(database.db, { timeZone: config.timeZone }),
    access,
  );
  registerAuditRoutes(app, createAuditService(database.db), access);
  registerAttendanceRoutes(app, attendance, access);
  registerRequestRoutes(app, createRequestService(database.db), access);
  registerPlanningRoutes(app, createPlanningService(database.db), access);
  registerLocationRoutes(app, createLocationService(database.db), access);
  registerDepartmentRoutes(
    app,
    createDepartmentRepository(database.db),
    access,
  );
  // Registrar rutas después del plugin OpenAPI para que capture los contratos.
  app.register(async (routes) => {
    const server = routes.withTypeProvider<TypeBoxTypeProvider>();
    server.get(
      '/api/health/live',
      { schema: { tags: ['Sistema'], response: { 200: LivenessSchema } } },
      async () => ({ status: 'ok' as const }),
    );
    server.get(
      '/api/health/ready',
      {
        schema: {
          tags: ['Sistema'],
          response: {
            200: ReadinessSchema,
            503: UnavailableSchema,
            500: ErrorSchema,
          },
        },
      },
      async (request, reply) => {
        reply.header('cache-control', 'no-store');
        try {
          await database.db.execute(sql`select 1`);
          return reply.code(200).send({ status: 'ok', database: 'ok' });
        } catch {
          request.log.warn(
            { code: 'DATABASE_UNAVAILABLE' },
            'PostgreSQL no disponible.',
          );
          return reply
            .code(503)
            .send({ status: 'unavailable', database: 'unavailable' });
        }
      },
    );
  });
  if (config.notificationWorkerEnabled) {
    let running: Promise<unknown> | null = null;
    const tick = () => {
      if (running) return;
      running = dispatchNotifications(database.db)
        .catch(() => {
          app.log.warn(
            { code: 'NOTIFICATION_DELIVERY_RETRY' },
            'La entrega de avisos se reintentará.',
          );
        })
        .finally(() => {
          running = null;
        });
    };
    let timer: ReturnType<typeof setInterval> | undefined;
    app.addHook('onReady', async () => {
      timer = setInterval(tick, 1000);
      timer.unref();
      tick();
    });
    app.addHook('onClose', async () => {
      if (timer) clearInterval(timer);
      await running;
    });
  }
  if (config.attendanceWorkerEnabled) {
    let running: Promise<unknown> | null = null;
    const tick = () => {
      if (running) return;
      running = attendance
        .evaluateDue()
        .catch(() => {
          app.log.warn(
            { code: 'ATTENDANCE_EVALUATION_RETRY' },
            'La evaluación de asistencia se reintentará.',
          );
        })
        .finally(() => {
          running = null;
        });
    };
    let timer: ReturnType<typeof setInterval> | undefined;
    app.addHook('onReady', async () => {
      timer = setInterval(
        tick,
        config.attendanceEvaluationIntervalSeconds * 1000,
      );
      timer.unref();
      tick();
    });
    app.addHook('onClose', async () => {
      if (timer) clearInterval(timer);
      await running;
    });
  }
  return app;
}
