import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { SessionView } from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import {
  createAttendanceService,
  initializeAttendancePolicy,
} from '../src/modules/attendance/index.js';
import {
  attendancePolicies,
  attendanceSessions,
  attendanceAttempts,
  attendanceIncidents,
  attendanceEvaluations,
} from '../src/modules/attendance/schema.js';
import { employees } from '../src/modules/employees/schema.js';
import { departments } from '../src/modules/departments/schema.js';
import {
  scheduleAssignments,
  shiftTemplates,
} from '../src/modules/planning/schema.js';
import { createPlanningService } from '../src/modules/planning/index.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import {
  workLocations,
  locationAuthorizations,
  geoChecks,
} from '../src/modules/locations/schema.js';
import {
  auditEvents,
  notificationOutbox,
} from '../src/modules/audit/schema.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('Se requiere TEST_DATABASE_URL _test.');
const control = createDatabase(source),
  name = `asistencia_attendance_${randomUUID().replaceAll('-', '')}_test`,
  url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
const app = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
let now = new Date('2030-01-10T14:00:00Z');
const service = createAttendanceService(database.db, { clock: () => now });
let scope: SessionView,
  employeeId: string,
  userId: string,
  departmentId: string,
  templateId: string,
  admin: Awaited<ReturnType<typeof login>>,
  member: Awaited<ReturnType<typeof login>>;
let made = false;
const template = {
  name: 'Operativo',
  category: 'OPERATIONAL' as const,
  modality: 'HOME_OFFICE' as const,
  startTime: '08:00',
  endTime: '16:00',
  weekdays: [1, 2, 3, 4, 5],
  timeZone: 'America/Merida',
  active: true,
};
async function slot(
  starts = '2030-01-10T14:00:00Z',
  ends = '2030-01-10T22:00:00Z',
  onsite = false,
) {
  const [row] = await database.db
    .insert(scheduleAssignments)
    .values({
      employeeId,
      templateId,
      workDate: starts.slice(0, 10),
      kind: 'REGULAR',
      templateVersion: 1,
      startsAt: new Date(starts),
      endsAt: new Date(ends),
      modality: onsite ? 'ONSITE' : 'HOME_OFFICE',
      locationId: onsite ? siteId : null,
      timeZone: 'America/Merida',
      templateName: 'Congelado',
      snapshot: { ...template, version: 1 },
      status: 'PUBLISHED',
      publishedAt: new Date('2030-01-01T00:00:00Z'),
    })
    .returning();
  return row!;
}
async function punch(
  id: string,
  direction: 'ENTRY' | 'EXIT' = 'ENTRY',
  extra: Record<string, unknown> = {},
) {
  return service.punch(
    { assignmentId: id, direction, idempotencyKey: randomUUID(), ...extra },
    scope,
  );
}
let siteId: string;
beforeAll(async () => {
  await control.pool.query(`CREATE DATABASE "${name}"`);
  made = true;
  await runMigrations(database.db);
  await database.db.transaction(initializeAttendancePolicy);
  await database.db
    .update(attendancePolicies)
    .set({ activatedAt: new Date('2030-01-01T00:00:00Z') });
  const identity = createIdentityService(database.db);
  const adminUser = await identity.createInitialAdmin({
    email: 'attendance-admin@example.test',
    name: 'Admin',
    password: TEST_PASSWORD,
  });
  const user = await identity.createUser({
    email: 'attendance-user@example.test',
    name: 'Empleado',
    password: TEST_PASSWORD,
    roles: ['EMPLOYEE'],
    active: true,
  });
  userId = user.id;
  const [department] = await database.db
    .insert(departments)
    .values({ name: 'Asistencia' })
    .returning();
  departmentId = department!.id;
  const [employee] = await database.db
    .insert(employees)
    .values({
      employeeNumber: 'A001',
      fullName: 'Asistencia propia',
      departmentId,
      position: 'Operador',
      joinedOn: '2026-01-01',
      category: 'OPERATIONAL',
      userId,
    })
    .returning();
  employeeId = employee!.id;
  const [t] = await database.db
    .insert(shiftTemplates)
    .values(template)
    .returning();
  templateId = t!.id;
  const [site] = await database.db
    .insert(workLocations)
    .values({
      name: 'Sitio asignado',
      latitude: 21,
      longitude: -89,
      radiusMeters: 10,
      maxAccuracyMeters: 10,
    })
    .returning();
  siteId = site!.id;
  await database.db.insert(locationAuthorizations).values({
    employeeId,
    locationId: siteId,
    startsOn: '2020-01-01',
    createdBy: adminUser.id,
  });
  scope = {
    user: { ...user, createdAt: user.createdAt },
    csrfToken: '',
    expiresAt: new Date().toISOString(),
    employeeId,
    departmentIds: [departmentId],
    managedDepartmentIds: [],
    permissions: {
      manageUsers: false,
      manageOrganization: false,
      viewAllEmployees: false,
    },
  };
  admin = await login(app, adminUser.email);
  member = await login(app, user.email);
});
afterAll(async () => {
  await app.close();
  await database.pool.end();
  try {
    if (made) await control.pool.query(`DROP DATABASE "${name}"`);
  } finally {
    await control.pool.end();
  }
});
it('keeps accepted 08:30 entry, frozen policy, exit omission and a single justifiable late absence', async () => {
  const previous = await service.policy();
  const configured = {
    lateToleranceMinutes: 10,
    earlyEntryMinutes: 30,
    lateExitMinutes: 120,
    administrativeAbsenceMinutes: 30,
  };
  try {
    await service.updatePolicy(configured, userId);
    const s = await slot('2030-03-04T14:00:00Z', '2030-03-04T23:00:00Z', true);
    await database.db
      .update(scheduleAssignments)
      .set({
        snapshot: {
          ...template,
          category: 'ADMINISTRATIVE',
          modality: 'ONSITE',
          version: 1,
        },
      })
      .where(eq(scheduleAssignments.id, s.id));
    now = new Date('2030-03-04T14:30:00Z');
    const payload = {
      assignmentId: s.id,
      direction: 'ENTRY' as const,
      idempotencyKey: randomUUID(),
      latitude: 21,
      longitude: -89,
      accuracy: 1,
      reason: 'Tráfico',
    };
    const accepted = await service.punch(payload, scope);
    expect(accepted.attempt).toMatchObject({
      accepted: true,
      recordedAt: '2030-03-04T14:30:00.000Z',
    });
    expect(accepted.incidents.map((i) => i.kind)).toEqual(['LATE_ABSENCE']);
    expect(await service.punch(payload, scope)).toEqual(accepted);
    await service.updatePolicy(
      { ...configured, administrativeAbsenceMinutes: null },
      userId,
    );
    now = new Date('2030-03-05T03:00:00Z');
    expect((await service.evaluate('2030-03-04', '2030-03-04')).evaluated).toBe(
      1,
    );
    expect((await service.evaluate('2030-03-04', '2030-03-04')).evaluated).toBe(
      0,
    );
    const [summary] = await service.summary('2030-03-04', '2030-03-04', scope);
    expect(summary!.evaluations[0]!.result).toBe('LATE_ABSENCE');
    expect(summary!.policy).toMatchObject({ administrativeAbsenceMinutes: 30 });
    expect(summary!.incidents.map((i) => i.kind).sort()).toEqual([
      'LATE_ABSENCE',
      'MISSING_EXIT',
    ]);
    for (const i of summary!.incidents)
      if (i.requiresReason)
        await service.reason(i.id, 'Motivo conservado', scope);
  } finally {
    await service.updatePolicy(
      {
        lateToleranceMinutes: previous.lateToleranceMinutes,
        earlyEntryMinutes: previous.earlyEntryMinutes,
        lateExitMinutes: previous.lateExitMinutes,
        administrativeAbsenceMinutes:
          previous.administrativeAbsenceMinutes ?? null,
      },
      userId,
    );
    now = new Date('2030-01-10T14:00:00Z');
  }
});
it('does not apply a new administrative cutoff to an already started control', async () => {
  const previous = await service.policy();
  const settings = {
    lateToleranceMinutes: 10,
    earlyEntryMinutes: 30,
    lateExitMinutes: 120,
  };
  try {
    await service.updatePolicy(
      { ...settings, administrativeAbsenceMinutes: null },
      userId,
    );
    const s = await slot('2030-03-06T14:00:00Z', '2030-03-06T23:00:00Z', true);
    await database.db
      .update(scheduleAssignments)
      .set({
        snapshot: {
          ...template,
          category: 'ADMINISTRATIVE',
          modality: 'ONSITE',
          version: 1,
        },
      })
      .where(eq(scheduleAssignments.id, s.id));
    now = new Date('2030-03-06T14:40:00Z');
    expect(
      (
        await punch(s.id, 'ENTRY', {
          latitude: 21,
          longitude: -89,
          accuracy: 1,
          reason: 'Motivo original',
        })
      ).incidents[0]!.kind,
    ).toBe('LATE_ENTRY');
    await service.updatePolicy(
      { ...settings, administrativeAbsenceMinutes: 30 },
      userId,
    );
    now = new Date('2030-03-06T23:00:00Z');
    expect(
      (await punch(s.id, 'EXIT', { latitude: 21, longitude: -89, accuracy: 1 }))
        .attempt.accepted,
    ).toBe(true);
    now = new Date('2030-03-07T03:00:00Z');
    await service.evaluate('2030-03-06', '2030-03-06');
    const [summary] = await service.summary('2030-03-06', '2030-03-06', scope);
    expect(summary!.policy!.administrativeAbsenceMinutes).toBeNull();
    expect(summary!.evaluations[0]!.result).toBe('COMPLETE');
    expect(summary!.incidents.map((i) => i.kind)).toEqual(['LATE_ENTRY']);
  } finally {
    await service.updatePolicy(
      {
        ...settings,
        administrativeAbsenceMinutes:
          previous.administrativeAbsenceMinutes ?? null,
      },
      userId,
    );
    now = new Date('2030-01-10T14:00:00Z');
  }
});
it('rejects cutoff values outside bounds or within the tolerance', async () => {
  for (const value of [0, 10, 1.5, 1441])
    await expect(
      service.updatePolicy(
        {
          lateToleranceMinutes: 10,
          earlyEntryMinutes: 30,
          lateExitMinutes: 120,
          administrativeAbsenceMinutes: value,
        },
        userId,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_POLICY' });
});
it('HTTP forbids foreign payload, supplied server time, CSRF and management operations', async () => {
  expect((await app.inject('/api/attendance/me')).statusCode).toBe(401);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/attendance/punches',
        headers: member.headers,
        payload: {
          assignmentId: randomUUID(),
          direction: 'ENTRY',
          idempotencyKey: randomUUID(),
          recordedAt: now.toISOString(),
        },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/attendance/punches',
        headers: { cookie: member.headers.cookie },
        payload: {
          assignmentId: randomUUID(),
          direction: 'ENTRY',
          idempotencyKey: randomUUID(),
        },
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/attendance/policy',
        headers: member.headers,
        payload: {
          lateToleranceMinutes: 10,
          earlyEntryMinutes: 30,
          lateExitMinutes: 120,
        },
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({ url: '/api/attendance/me', headers: admin.headers })
    ).json().employee,
  ).toBeNull();
});
it('serializes concurrent duplicate retries with one mark, no home GPS and original response', async () => {
  const s = await slot();
  now = s.startsAt;
  const input = {
    assignmentId: s.id,
    direction: 'ENTRY' as const,
    idempotencyKey: randomUUID(),
  };
  const before = await database.db.select().from(geoChecks);
  const [a, b] = await Promise.all([
    service.punch(input, scope),
    service.punch(input, scope),
  ]);
  expect(a).toEqual(b);
  expect(a.attempt.accepted).toBe(true);
  expect(a.attempt.geoCheckId).toBeNull();
  expect(
    (await database.db.select().from(geoChecks)).length - before.length,
  ).toBe(0);
  await expect(
    service.punch({ ...input, direction: 'EXIT' }, scope),
  ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  const duplicate = await punch(s.id, 'ENTRY', { reason: 'Intento duplicado' });
  expect(duplicate.attempt.rejectionCode).toBe('DUPLICATE_DIRECTION');
  expect(
    (
      await database.db
        .select()
        .from(attendanceAttempts)
        .where(eq(attendanceAttempts.assignmentId, s.id))
    ).filter((a) => a.accepted),
  ).toHaveLength(1);
  await expect(
    createPlanningService(database.db).cancelAssignment(
      s.id,
      'Ocultar historial',
    ),
  ).rejects.toMatchObject({ code: 'ATTENDANCE_STARTED' });
});
it('keeps actual late and early marks, blocks next punch pending own reason, immutable policy', async () => {
  const s = await slot();
  now = new Date('2030-01-10T14:11:00Z');
  const p = await punch(s.id);
  expect(p.attempt.accepted).toBe(true);
  expect(p.incidents[0]!.kind).toBe('LATE_ENTRY');
  expect(p.requiresReason).toBe(true);
  await expect(punch(s.id, 'EXIT')).rejects.toMatchObject({
    code: 'REASON_REQUIRED',
  });
  await expect(
    service.reason(p.incidents[0]!.id, 'Otro', {
      ...scope,
      employeeId: randomUUID(),
    }),
  ).rejects.toMatchObject({ code: 'INCIDENT_NOT_FOUND' });
  await service.reason(p.incidents[0]!.id, 'Transporte', scope);
  await service.updatePolicy(
    { lateToleranceMinutes: 30, earlyEntryMinutes: 15, lateExitMinutes: 5 },
    userId,
  );
  now = new Date('2030-01-10T21:59:00Z');
  const exit = await punch(s.id, 'EXIT', { reason: 'Salida necesaria' });
  expect(exit.attempt.accepted).toBe(true);
  expect(exit.incidents[0]!.kind).toBe('EARLY_EXIT');
  expect(exit.requiresReason).toBe(false);
  const [c] = await database.db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.assignmentId, s.id));
  expect(c!.policySnapshot.lateToleranceMinutes).toBe(10);
  await service.updatePolicy(
    { lateToleranceMinutes: 10, earlyEntryMinutes: 30, lateExitMinutes: 120 },
    userId,
  );
});
it('persists rejected GPS and cannot reuse UUID with repaired GPS, snapshot overrides changed category', async () => {
  const s = await slot(undefined, undefined, true);
  now = s.startsAt;
  const key = randomUUID();
  const bad = await service.punch(
    {
      assignmentId: s.id,
      direction: 'ENTRY',
      idempotencyKey: key,
      latitude: 22,
      longitude: -89,
      accuracy: 1,
      reason: 'GPS fuera',
    },
    scope,
  );
  expect(bad.attempt.accepted).toBe(false);
  expect(bad.attempt.rejectionCode).toBe('OUTSIDE_GEOFENCE');
  await expect(
    service.punch(
      {
        assignmentId: s.id,
        direction: 'ENTRY',
        idempotencyKey: key,
        latitude: 21,
        longitude: -89,
        accuracy: 1,
      },
      scope,
    ),
  ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  const good = await punch(s.id, 'ENTRY', {
    latitude: 21,
    longitude: -89,
    accuracy: 1,
  });
  expect(good.attempt.accepted).toBe(true);
  await database.db
    .update(employees)
    .set({ category: 'ADMINISTRATIVE' })
    .where(eq(employees.id, employeeId));
  const h = await slot();
  const beforeHome = await database.db.select().from(geoChecks);
  const home = await punch(h.id, 'ENTRY', {
    latitude: 21,
    longitude: -89,
    accuracy: 1,
  });
  expect(home.attempt.accepted).toBe(true);
  expect(home.attempt.geoCheckId).toBeNull();
  expect(await database.db.select().from(geoChecks)).toEqual(beforeHome);
});
it('allows actual EXIT without entry with omission and forbids subsequent out of order ENTRY', async () => {
  const s = await slot();
  now = s.endsAt;
  const e = await punch(s.id, 'EXIT', { reason: 'Omití entrada' });
  expect(e.attempt.accepted).toBe(true);
  expect(e.incidents.map((i) => i.kind)).toContain('MISSING_ENTRY');
  const entry = await punch(s.id, 'ENTRY', {
    reason: 'Entrada fuera de orden',
  });
  expect(entry.attempt.rejectionCode).toBe('OUT_OF_ORDER');
});
it('scopes raw history by current responsibility and refuses impersonation', async () => {
  const own = await service.summary('2030-01-10', '2030-01-10', scope);
  expect(own.length).toBeGreaterThan(0);
  expect(own.every((s) => s.employeeId === employeeId)).toBe(true);
  const foreign = { ...scope, employeeId: randomUUID() };
  expect(await service.summary('2030-01-10', '2030-01-10', foreign)).toEqual(
    [],
  );
  expect(
    (
      await service.summary('2030-01-10', '2030-01-10', {
        ...foreign,
        managedDepartmentIds: [departmentId],
      })
    ).length,
  ).toBe(own.length);
  await expect(punch(randomUUID())).rejects.toMatchObject({
    code: 'ASSIGNMENT_NOT_FOUND',
  });
  await expect(
    service.punch(
      {
        assignmentId: own[0]!.assignmentId,
        direction: 'ENTRY',
        idempotencyKey: randomUUID(),
      },
      foreign,
    ),
  ).rejects.toMatchObject({ code: 'OWN_EMPLOYEE_REQUIRED' });
  await expect(
    service.summary('2030-02-30', '2030-03-01', scope),
  ).rejects.toMatchObject({ code: 'INVALID_RANGE' });
});
it('records overnight entry-only omission only at the frozen closing instant', async () => {
  const s = await slot('2030-01-10T22:00:00Z', '2030-01-11T06:00:00Z');
  now = s.startsAt;
  await punch(s.id);
  now = new Date('2030-01-11T07:59:59Z');
  await service.evaluate('2030-01-10', '2030-01-10');
  const [c] = await database.db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.assignmentId, s.id));
  expect(
    await database.db
      .select()
      .from(attendanceEvaluations)
      .where(eq(attendanceEvaluations.sessionId, c!.id)),
  ).toHaveLength(0);
  now = new Date('2030-01-11T08:00:00Z');
  await service.evaluate('2030-01-10', '2030-01-10');
  expect(
    await database.db
      .select()
      .from(attendanceEvaluations)
      .where(eq(attendanceEvaluations.sessionId, c!.id)),
  ).toHaveLength(0);
  now = new Date('2030-01-11T08:00:00.001Z');
  await service.evaluate('2030-01-10', '2030-01-10');
  expect(
    (
      await database.db
        .select()
        .from(attendanceIncidents)
        .where(eq(attendanceIncidents.sessionId, c!.id))
    ).map((i) => i.kind),
  ).toContain('MISSING_EXIT');
  const pending = (await service.me(scope)).pendingIncidents;
  for (const i of pending)
    await service.reason(
      i.id,
      'Omisión justificada para continuar prueba',
      scope,
    );
});
it('evaluates absence and omission once, avoids historic invented absence and does not resend outbox', async () => {
  const s = await slot('2030-01-11T14:00:00Z', '2030-01-11T22:00:00Z');
  const historic = await slot('2029-01-01T14:00:00Z', '2029-01-01T22:00:00Z');
  now = new Date('2030-01-12T01:00:00Z');
  await service.evaluateDue();
  const [session] = await database.db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.assignmentId, s.id));
  expect(session).toBeDefined();
  expect(
    (
      await database.db
        .select()
        .from(attendanceIncidents)
        .where(eq(attendanceIncidents.sessionId, session!.id))
    ).map((i) => i.kind),
  ).toContain('ABSENCE');
  expect(
    await database.db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.assignmentId, historic.id)),
  ).toHaveLength(0);
  const before = await database.db.select().from(notificationOutbox);
  expect(await service.evaluateDue()).toEqual({ evaluated: 0 });
  expect((await database.db.select().from(notificationOutbox)).length).toBe(
    before.length,
  );
  expect(
    await database.db
      .select()
      .from(attendanceEvaluations)
      .where(eq(attendanceEvaluations.sessionId, session!.id)),
  ).toHaveLength(1);
});
it('attributes manual evaluation to its actor and retains system worker identity', async () => {
  const manual = await slot('2030-01-12T14:00:00Z', '2030-01-12T22:00:00Z');
  const worker = await slot('2030-01-13T14:00:00Z', '2030-01-13T22:00:00Z');
  now = new Date('2030-01-14T01:00:00Z');
  await service.evaluate('2030-01-12', '2030-01-12', userId);
  await service.evaluateDue();
  for (const [assignmentId, actorId] of [
    [manual.id, userId],
    [worker.id, null],
  ] as const) {
    const [c] = await database.db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.assignmentId, assignmentId));
    const [e] = await database.db
      .select()
      .from(attendanceEvaluations)
      .where(eq(attendanceEvaluations.sessionId, c!.id));
    const [audit] = await database.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.entityId, e!.id));
    expect(audit!.actorId).toBe(actorId);
    const [incident] = await database.db
      .select()
      .from(attendanceIncidents)
      .where(eq(attendanceIncidents.sessionId, c!.id));
    const [incidentAudit] = await database.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.entityId, incident!.id));
    expect(incidentAudit!.actorId).toBe(actorId);
  }
});
it('rolls back GPS, raw attempt, incident and audit if downstream write fails', async () => {
  // Clear required reasons as the test employee, then inject a database failure after GPS.
  for (const i of await database.db.select().from(attendanceIncidents))
    await service.reason(i.id, 'Motivo previo', scope);
  const s = await slot('2030-01-13T14:00:00Z', '2030-01-13T22:00:00Z');
  now = s.startsAt;
  const before = {
    geo: (await database.db.select().from(geoChecks)).length,
    audit: (await database.db.select().from(auditEvents)).length,
  };
  await database.db.execute(
    sql`create function fail_attendance_attempt() returns trigger language plpgsql as $$ begin raise exception 'forced rollback'; end; $$`,
  );
  await database.db.execute(
    sql`create trigger attendance_failure before insert on attendance_attempts for each row execute function fail_attendance_attempt()`,
  );
  try {
    await expect(punch(s.id)).rejects.toThrow();
  } finally {
    await database.db.execute(
      sql`drop trigger attendance_failure on attendance_attempts`,
    );
    await database.db.execute(sql`drop function fail_attendance_attempt()`);
  }
  expect((await database.db.select().from(geoChecks)).length).toBe(before.geo);
  expect((await database.db.select().from(auditEvents)).length).toBe(
    before.audit,
  );
  expect(
    await database.db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.assignmentId, s.id)),
  ).toHaveLength(0);
});
it('real server workers evaluate a due shift and deliver its incident notification once', async () => {
  const actualNow = Date.now();
  await database.db.update(attendancePolicies).set({
    activatedAt: new Date(actualNow - 86400000),
  });
  await service.updatePolicy(
    { lateToleranceMinutes: 10, earlyEntryMinutes: 30, lateExitMinutes: 0 },
    userId,
  );
  const due = await slot(
    new Date(actualNow - 120000).toISOString(),
    new Date(actualNow - 2000).toISOString(),
  );
  const workerApp = buildApp(
    parseConfig({
      DATABASE_URL: url.toString(),
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      ATTENDANCE_WORKER_ENABLED: 'true',
      ATTENDANCE_EVALUATION_INTERVAL_SECONDS: '1',
      NOTIFICATION_WORKER_ENABLED: 'true',
    }),
  );
  try {
    await workerApp.ready();
    await expect
      .poll(
        async () => {
          const result = await database.pool.query(
            `select e.result from attendance_evaluations e
         join attendance_sessions s on s.id=e.session_id where s.assignment_id=$1`,
            [due.id],
          );
          return result.rows;
        },
        { timeout: 8000 },
      )
      .toEqual([{ result: 'ABSENCE' }]);
    await expect
      .poll(
        async () => {
          const result = await database.pool.query(
            `select n.href from notifications n join notification_outbox o on o.id=n.outbox_id
         join audit_events a on a.id=o.event_id
         join attendance_incidents i on i.id=a.entity_id
         where i.assignment_id=$1 and n.user_id=$2`,
            [due.id, userId],
          );
          return result.rows;
        },
        { timeout: 8000 },
      )
      .toEqual([{ href: '/incidencias' }]);
    const repeated = await createAttendanceService(database.db).evaluateDue();
    expect(repeated).toEqual({ evaluated: 0 });
  } finally {
    await workerApp.close();
  }
});
