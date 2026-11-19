import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { createEmployeeService } from '../src/modules/employees/index.js';
import {
  auditEvents,
  notificationOutbox,
} from '../src/modules/audit/schema.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';
import type { SessionView } from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import {
  createPlanningService,
  initializePlanningDefaults,
} from '../src/modules/planning/index.js';
import { departments } from '../src/modules/departments/schema.js';
import { employees } from '../src/modules/employees/schema.js';
import { users } from '../src/modules/identity/schema.js';
import {
  workLocations,
  locationAuthorizations,
} from '../src/modules/locations/schema.js';
loadEnvFile('.env');
const base = process.env.TEST_DATABASE_URL;
if (!base || !new URL(base).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL debe terminar en _test.');
const admin = createDatabase(base);
const name = `planning_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(base);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
const service = createPlanningService(database.db);
const server = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
let operational: string,
  administrative: string,
  other: string,
  departmentId: string,
  userId: string;
const template = {
  name: 'Noche',
  category: 'OPERATIONAL' as const,
  modality: 'HOME_OFFICE' as const,
  startTime: '16:00',
  endTime: '00:00',
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  timeZone: 'America/Merida',
  active: true,
};
const scope = (
  employeeId: string | null,
  all = false,
  managedDepartmentIds: string[] = [],
): SessionView => ({
  user: {
    id: userId,
    name: 'Prueba',
    email: 'planning@example.test',
    roles: ['EMPLOYEE'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  csrfToken: '',
  expiresAt: new Date().toISOString(),
  employeeId,
  departmentIds: [],
  managedDepartmentIds,
  permissions: {
    viewAllEmployees: all,
    manageOrganization: false,
    manageUsers: false,
  },
});
beforeAll(async () => {
  await admin.pool.query(`CREATE DATABASE "${name}"`);
  await runMigrations(database.db);
  const [dep] = await database.db
    .insert(departments)
    .values({ name: 'Pruebas planificación' })
    .returning();
  departmentId = dep!.id;
  const [user] = await database.db
    .insert(users)
    .values({
      email: 'planning@example.test',
      name: 'Prueba',
      passwordHash: 'isolated-test-not-login',
      active: true,
    })
    .returning();
  userId = user!.id;
  const rows = await database.db
    .insert(employees)
    .values([
      {
        employeeNumber: 'P1',
        fullName: 'Operativo',
        departmentId,
        position: 'Prueba',
        joinedOn: '2026-01-01',
        category: 'OPERATIONAL' as const,
        userId,
      },
      {
        employeeNumber: 'P2',
        fullName: 'Administrativo',
        departmentId,
        position: 'Prueba',
        joinedOn: '2026-01-01',
        category: 'ADMINISTRATIVE' as const,
      },
      {
        employeeNumber: 'P3',
        fullName: 'Otro',
        departmentId,
        position: 'Prueba',
        joinedOn: '2026-01-01',
        category: 'OPERATIONAL' as const,
      },
    ])
    .returning();
  [operational, administrative, other] = rows.map((r) => r.id) as [
    string,
    string,
    string,
  ];
});
afterAll(async () => {
  await server.close();
  await database.pool.end();
  await admin.pool.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.pool.end();
});
describe('planificación PostgreSQL aislada', () => {
  it('inicializa cuatro plantillas una vez sin asignar empleados', async () => {
    await initializePlanningDefaults(database.db);
    await initializePlanningDefaults(database.db);
    expect(await service.listTemplates()).toHaveLength(4);
    expect(
      await service.listAssignments(
        '2026-11-01',
        '2026-11-30',
        scope(null, true),
      ),
    ).toEqual([]);
  });
  it('serializa horarios concurrentes y permite intervalos adyacentes', async () => {
    const t = await service.saveTemplate(template);
    const input = {
      employeeId: operational,
      templateId: t.id,
      workDate: '2026-11-12',
      kind: 'REGULAR' as const,
    };
    const results = await Promise.allSettled([
      service.saveAssignment(input),
      service.saveAssignment(input),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'PLANNING_CONFLICT' },
    });
    const next = await service.saveTemplate({
      ...template,
      startTime: '00:00',
      endTime: '08:00',
    });
    const row = await service.saveAssignment({
      ...input,
      templateId: next.id,
      workDate: '2026-11-13',
    });
    expect(row.startsAt.toISOString()).toBe('2026-11-13T06:00:00.000Z');
  });
  it('conserva snapshot publicado y permite reemplazo tras cancelar', async () => {
    const t = await service.saveTemplate(template);
    const input = {
      employeeId: operational,
      templateId: t.id,
      workDate: '2026-11-14',
      kind: 'REGULAR' as const,
    };
    const draft = await service.saveAssignment(input);
    const published = await service.publishAssignment(draft.id);
    await service.saveTemplate(
      { ...template, name: 'Cambio', startTime: '15:00' },
      t.id,
    );
    expect(
      (
        await service.listAssignments(
          input.workDate,
          input.workDate,
          scope(operational),
        )
      )[0]!.snapshot,
    ).toEqual(published.snapshot);
    await expect(service.saveAssignment(input, draft.id)).rejects.toMatchObject(
      { code: 'PLANNING_CONFLICT' },
    );
    await expect(service.deleteTemplate(t.id)).rejects.toMatchObject({
      code: 'PLANNING_IN_USE',
    });
    await expect(service.cancelAssignment(draft.id, ' ')).rejects.toThrow();
    await service.cancelAssignment(draft.id, 'Reasignación');
    expect((await service.saveAssignment(input)).status).toBe('DRAFT');
  });
  it('rechaza inactivos, categorías, días y festivos regulares', async () => {
    const t = await service.saveTemplate({ ...template, weekdays: [1] });
    const input = {
      employeeId: other,
      templateId: t.id,
      workDate: '2026-11-15',
      kind: 'REGULAR' as const,
    };
    await expect(service.saveAssignment(input)).rejects.toThrow();
    await service.saveAssignment({ ...input, kind: 'DUTY' });
    await service.saveHoliday({ name: 'Festivo manual', date: '2026-11-16' });
    await expect(
      service.saveAssignment({ ...input, workDate: '2026-11-16' }),
    ).rejects.toThrow();
    await service.saveAssignment({
      ...input,
      workDate: '2026-11-16',
      kind: 'DUTY',
    });
    await expect(
      service.saveAssignment({
        ...input,
        employeeId: administrative,
        workDate: '2026-11-23',
      }),
    ).rejects.toThrow();
    await database.db
      .update(employees)
      .set({ status: 'INACTIVE' })
      .where(eq(employees.id, other));
    await expect(
      service.saveAssignment({ ...input, workDate: '2026-11-23' }),
    ).rejects.toThrow();
    await database.db
      .update(employees)
      .set({ status: 'ACTIVE' })
      .where(eq(employees.id, other));
  });
  it('exige centro activo y autorización efectiva para presencial', async () => {
    const t = await service.saveTemplate({
      ...template,
      category: 'ADMINISTRATIVE',
      modality: 'ONSITE',
      startTime: '08:00',
      endTime: '17:00',
    });
    const input = {
      employeeId: administrative,
      templateId: t.id,
      workDate: '2026-11-17',
      kind: 'REGULAR' as const,
    };
    await expect(service.saveAssignment(input)).rejects.toThrow();
    const [location] = await database.db
      .insert(workLocations)
      .values({ name: 'Centro', latitude: 21, longitude: -89 })
      .returning();
    await expect(
      service.saveAssignment({ ...input, locationId: location!.id }),
    ).rejects.toThrow();
    await database.db.insert(locationAuthorizations).values({
      employeeId: administrative,
      locationId: location!.id,
      startsOn: input.workDate,
      endsOn: input.workDate,
      createdBy: userId,
    });
    expect(
      (await service.saveAssignment({ ...input, locationId: location!.id }))
        .locationId,
    ).toBe(location!.id);
    await expect(
      service.saveAssignment({
        ...input,
        workDate: '2026-11-18',
        locationId: location!.id,
      }),
    ).rejects.toThrow();
  });
  it('revalida plantilla activa al publicar borrador', async () => {
    const t = await service.saveTemplate(template);
    const row = await service.saveAssignment({
      employeeId: other,
      templateId: t.id,
      workDate: '2026-11-20',
      kind: 'REGULAR',
    });
    await service.saveTemplate({ ...template, active: false }, t.id);
    await expect(service.publishAssignment(row.id)).rejects.toThrow();
  });
  it('limita lectura propia, jefatura y dirección', async () => {
    expect(
      (
        await service.listAssignments(
          '2026-11-01',
          '2026-11-30',
          scope(operational),
        )
      ).every((r) => r.employeeId === operational),
    ).toBe(true);
    expect(
      await service.listAssignments('2026-11-01', '2026-11-30', scope(null)),
    ).toEqual([]);
    expect(
      (
        await service.listAssignments(
          '2026-11-01',
          '2026-11-30',
          scope(null, false, [departmentId]),
        )
      ).length,
    ).toBeGreaterThan(2);
    expect(
      (
        await service.listAssignments(
          '2026-11-01',
          '2026-11-30',
          scope(null, true),
        )
      ).length,
    ).toBeGreaterThan(2);
  });
  it('guarda auditoría y avisos de publicación/cancelación en la misma base', async () => {
    const rows = await database.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, 'planning.assignment.publish'));
    expect(rows).toHaveLength(1);
    const outbox = await database.db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.recipientId, userId));
    expect(outbox.every((row) => row.href === '/calendario')).toBe(true);
    expect(outbox.map((row) => row.title)).toEqual([
      'Horario publicado',
      'Horario cancelado',
    ]);
  });
  it('HTTP exige sesión y CSRF, limita escritura al ADMIN/HR y deja dirección de solo lectura', async () => {
    const identity = createIdentityService(database.db, { sessionHours: 8 });
    const manager = await identity.createInitialAdmin({
      email: 'manager@example.test',
      name: 'Manager',
      password: TEST_PASSWORD,
    });
    const director = await identity.createUser({
      email: 'director@example.test',
      name: 'Director',
      password: TEST_PASSWORD,
      active: true,
      roles: ['EMPLOYEE'],
    });
    await database.db
      .update(employees)
      .set({ userId: director.id })
      .where(eq(employees.id, other));
    await createEmployeeService(database.db).assign(
      {
        kind: 'DIRECTOR',
        employeeId: other,
        departmentId: null,
        reason: 'Prueba aislada',
      },
      manager.id,
    );
    const adminSession = await login(server, 'manager@example.test');
    const directorSession = await login(server, 'director@example.test');
    expect(
      (await server.inject({ method: 'GET', url: '/api/shift-templates' }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/shift-templates',
          headers: { cookie: adminSession.cookie },
          payload: template,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/shift-templates',
          headers: directorSession.headers,
          payload: template,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/shift-templates',
          headers: adminSession.headers,
          payload: template,
        })
      ).statusCode,
    ).toBe(201);
    const response = await server.inject({
      method: 'GET',
      url: '/api/schedule-assignments?from=2026-11-01&to=2026-11-30',
      headers: directorSession.headers,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ items: unknown[] }>().items.length).toBeGreaterThan(
      2,
    );
    expect(
      (
        await server.inject({
          method: 'GET',
          url: '/api/schedule-assignments?from=2026-01-01&to=2026-12-31',
          headers: directorSession.headers,
        })
      ).statusCode,
    ).toBe(400);
  });
});
