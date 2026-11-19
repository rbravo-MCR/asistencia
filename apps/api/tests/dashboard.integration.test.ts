import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Require _test');
const control = createDatabase(source);
const name = `dashboard_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
const app = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
let made = false;
let admin: Awaited<ReturnType<typeof login>>,
  member: typeof admin,
  hr: typeof admin;
beforeAll(async () => {
  await control.pool.query(`create database "${name}"`);
  made = true;
  await runMigrations(database.db);
  const identity = createIdentityService(database.db);
  for (const role of ['ADMIN', 'EMPLOYEE', 'HR'] as const) {
    await identity.createUser({
      email: `${role}@example.test`,
      name: role,
      roles: [role],
      active: true,
      password: TEST_PASSWORD,
    });
  }
  admin = await login(app, 'ADMIN@example.test');
  member = await login(app, 'EMPLOYEE@example.test');
  hr = await login(app, 'HR@example.test');
});
afterAll(async () => {
  await app.close();
  await database.pool.end();
  try {
    if (made) await control.pool.query(`drop database "${name}"`);
  } finally {
    await control.pool.end();
  }
});
it('requires authentication and restricts configuration to ADMIN/HR', async () => {
  expect((await app.inject('/api/dashboard')).statusCode).toBe(401);
  expect(
    (
      await app.inject({
        url: '/api/configuration/status',
        headers: member.headers,
      })
    ).statusCode,
  ).toBe(403);
  for (const session of [admin, hr])
    expect(
      (
        await app.inject({
          url: '/api/configuration/status',
          headers: session.headers,
        })
      ).statusCode,
    ).toBe(200);
});
it('returns server date, empty personal state and no private personnel data', async () => {
  const response = await app.inject({
    url: '/api/dashboard',
    headers: member.headers,
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  const data = response.json();
  expect(data.personal).toBeNull();
  expect(data.teamVisible).toBe(false);
  expect(data.attendance.shifts).toEqual([]);
  expect(data.pendingRequests).toEqual([]);
  expect(data.date).toBe(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Merida',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(data.generatedAt)),
  );
  expect(response.body).not.toMatch(
    /password|csrfToken|contentBase64|latitude|reason"/,
  );
});
it('diagnoses missing leave configuration without requiring director or mutating data', async () => {
  const before = await database.pool.query(
    'select count(*)::int n from audit_events',
  );
  const response = await app.inject({
    url: '/api/configuration/status',
    headers: hr.headers,
  });
  expect(response.statusCode).toBe(200);
  const data = response.json();
  expect(data.issues.map((i: { code: string }) => i.code)).toEqual(
    expect.arrayContaining([
      'LEAVE_POLICY_REQUIRED',
      'PERMISSION_TYPES_REQUIRED',
    ]),
  );
  expect(
    (await database.pool.query('select count(*)::int n from audit_events'))
      .rows,
  ).toEqual(before.rows);
});

// Each scenario owns its records in this disposable PostgreSQL database.
import { eq } from 'drizzle-orm';
import type { SessionView } from '@asistencia/contracts';
import { employees, assignments } from '../src/modules/employees/schema.js';
import { createEmployeeService } from '../src/modules/employees/index.js';
import { departments } from '../src/modules/departments/schema.js';
import {
  shiftTemplates,
  scheduleAssignments,
} from '../src/modules/planning/schema.js';
import { createDashboardService } from '../src/modules/dashboard/index.js';
import { createAttendanceService } from '../src/modules/attendance/index.js';
import {
  attendanceAttempts,
  attendanceEvaluations,
  attendanceSessions,
} from '../src/modules/attendance/schema.js';
import { leaveRequests } from '../src/modules/requests/schema.js';
import {
  auditEvents,
  notificationOutbox,
  notifications,
} from '../src/modules/audit/schema.js';
async function person(departmentId?: string) {
  const label = randomUUID();
  if (!departmentId) {
    const [d] = await database.db
      .insert(departments)
      .values({ name: label })
      .returning();
    departmentId = d!.id;
  }
  const user = await createIdentityService(database.db).createUser({
    email: `${label}@example.test`,
    name: label,
    roles: ['EMPLOYEE'],
    password: TEST_PASSWORD,
    active: true,
  });
  const [e] = await database.db
    .insert(employees)
    .values({
      employeeNumber: label.slice(0, 20),
      fullName: label,
      departmentId,
      position: 'Test',
      joinedOn: '2020-01-01',
      category: 'OPERATIONAL',
      userId: user.id,
    })
    .returning();
  const account = await login(app, user.email);
  return { employee: e!, account, user };
}
async function scope(
  account: Awaited<ReturnType<typeof login>>,
): Promise<SessionView> {
  const org = await createEmployeeService(database.db).scopeFor(
    account.session.user.id,
  );
  return {
    ...account.session,
    ...org,
    permissions: {
      ...account.session.permissions,
      viewAllEmployees:
        account.session.permissions.viewAllEmployees || org.isDirector,
    },
  };
}
const template = {
  name: 'Dashboard turno',
  category: 'OPERATIONAL' as const,
  modality: 'HOME_OFFICE' as const,
  startTime: '08:00',
  endTime: '16:00',
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  timeZone: 'America/Merida',
  active: true,
};
async function shift(
  employeeId: string,
  starts = '2030-01-10T14:00:00Z',
  ends = '2030-01-10T22:00:00Z',
) {
  const [t] = await database.db
    .insert(shiftTemplates)
    .values(template)
    .returning();
  const [row] = await database.db
    .insert(scheduleAssignments)
    .values({
      employeeId,
      templateId: t!.id,
      workDate: starts.slice(0, 10),
      kind: 'REGULAR',
      templateVersion: 1,
      startsAt: new Date(starts),
      endsAt: new Date(ends),
      modality: 'HOME_OFFICE',
      timeZone: 'America/Merida',
      templateName: template.name,
      snapshot: { ...template, version: 1 },
      status: 'PUBLISHED',
      publishedAt: new Date('2026-01-01'),
    })
    .returning();
  return row!;
}
it('counts over 100 unread notices exactly and only for the current user', async () => {
  const rows = Array.from({ length: 105 }, () => ({
    requestId: randomUUID(),
    action: 'test.notice',
    entityType: 'test',
    entityId: randomUUID(),
  }));
  const events = await database.db.insert(auditEvents).values(rows).returning();
  const outbox = await database.db
    .insert(notificationOutbox)
    .values(
      events.map((e) => ({
        eventId: e.id,
        recipientId: member.session.user.id,
        title: 'Aviso',
        message: 'Privado',
        href: '/avisos',
      })),
    )
    .returning();
  await database.db.insert(notifications).values(
    outbox.map((o) => ({
      outboxId: o.id,
      userId: member.session.user.id,
      title: 'Aviso',
      message: 'Privado',
      href: '/avisos',
    })),
  );
  const data = (
    await app.inject({ url: '/api/dashboard', headers: member.headers })
  ).json();
  expect(data.unreadNotifications).toBe(105);
  expect(
    (await app.inject({ url: '/api/dashboard', headers: hr.headers })).json()
      .unreadNotifications,
  ).toBe(0);
});
it('keeps own/team/global attendance scoped and immediately removes revoked substitute authority', async () => {
  const own = await person(),
    peer = await person(own.employee.departmentId),
    foreign = await person();
  await shift(own.employee.id);
  await shift(peer.employee.id);
  await shift(foreign.employee.id);
  const head = await person(own.employee.departmentId),
    substitute = await person();
  const [headAssignment] = await database.db
    .insert(assignments)
    .values({
      kind: 'HEAD',
      employeeId: head.employee.id,
      departmentId: own.employee.departmentId,
      startsAt: new Date('2020-01-01'),
      reason: 'Test',
      createdBy: admin.session.user.id,
    })
    .returning();
  const [sub] = await database.db
    .insert(assignments)
    .values({
      kind: 'SUBSTITUTE',
      employeeId: substitute.employee.id,
      departmentId: own.employee.departmentId,
      sourceAssignmentId: headAssignment!.id,
      startsAt: new Date('2020-01-01'),
      endsAt: new Date('2035-01-01'),
      reason: 'Test',
      createdBy: admin.session.user.id,
    })
    .returning();
  const service = createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-10T15:00Z'),
  });
  expect(
    (await service.get(await scope(own.account))).attendance.shifts.map(
      (s) => s.employeeId,
    ),
  ).toEqual([own.employee.id]);
  for (const p of [head, substitute])
    expect(
      (await service.get(await scope(p.account))).attendance.shifts
        .map((s) => s.employeeId)
        .sort(),
    ).toEqual([own.employee.id, peer.employee.id].sort());
  expect(
    (await service.get(await scope(hr))).attendance.shifts.length,
  ).toBeGreaterThanOrEqual(3);
  await database.db
    .update(assignments)
    .set({ revokedAt: new Date() })
    .where(eq(assignments.id, sub!.id));
  expect(
    (await service.get(await scope(substitute.account))).attendance.shifts,
  ).toEqual([]);
});
it('uses Merida midnight and finds an ongoing personal shift that started the prior civil day', async () => {
  const own = await person();
  const slot = await shift(
    own.employee.id,
    '2030-01-10T22:00:00Z',
    '2030-01-11T06:00:00Z',
  );
  const service = createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-11T01:00Z'),
  });
  const data = await service.get(await scope(own.account));
  expect(data.date).toBe('2030-01-10');
  expect(data.personal?.shift?.id).toBe(slot.id);
  expect(data.personal?.balances).toEqual([]);
  const nextDay = await createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-11T06:00Z'),
  }).get(await scope(own.account));
  expect(nextDay.date).toBe('2030-01-11');
  expect(nextDay.personal?.shift?.workDate).toBe('2030-01-10');
  expect(nextDay.attendance.shifts).toEqual([]);
});
it('never infers a missing punch as an absence and never queues pre-activation historical shifts', async () => {
  const own = await person();
  await shift(own.employee.id);
  await shift(own.employee.id, '2000-01-10T14:00:00Z', '2000-01-10T22:00:00Z');
  const current = await createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-11T05:00Z'),
  }).get(await scope(own.account));
  expect(current.attendance.shifts[0]).toMatchObject({
    entry: false,
    exit: false,
    evaluation: null,
    phase: 'AWAITING_EVALUATION',
  });
  const old = await createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2000-01-11T05:00Z'),
  }).get(await scope(own.account));
  expect(old.attendance.shifts[0]).toMatchObject({
    phase: 'HISTORICAL',
    evaluation: null,
  });
  expect((await database.db.select().from(attendanceEvaluations)).length).toBe(
    0,
  );
});
it('keeps reason-only incidents pending and resolves via approved justification without changing punches', async () => {
  const own = await person();
  const slot = await shift(own.employee.id);
  const s = await scope(own.account);
  const attendance = createAttendanceService(database.db, {
    clock: () => new Date('2030-01-10T14:12Z'),
  });
  await attendance.punch(
    { assignmentId: slot.id, direction: 'ENTRY', idempotencyKey: randomUUID() },
    s,
  );
  const dashboard = createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-10T15:00Z'),
  });
  const [incident] = (await dashboard.get(s)).attendance.incidents;
  expect(incident).toMatchObject({ requiresReason: true, kind: 'LATE_ENTRY' });
  await attendance.reason(incident!.id, 'Motivo confidencial', s);
  expect((await dashboard.get(s)).attendance.incidents[0]).toMatchObject({
    requiresReason: false,
  });
  const before = await database.db
    .select()
    .from(attendanceAttempts)
    .where(eq(attendanceAttempts.assignmentId, slot.id));
  await database.db.insert(leaveRequests).values({
    kind: 'JUSTIFICATION',
    status: 'APPROVED',
    employeeId: own.employee.id,
    departmentId: own.employee.departmentId,
    reason: 'Privado',
    fromDate: slot.workDate,
    toDate: slot.workDate,
    incidentId: incident!.id,
    headMode: 'DEPARTMENT',
    createdAt: new Date(),
    createdBy: own.user.id,
    resolvedAt: new Date(),
  });
  expect((await dashboard.get(s)).attendance.incidents).toEqual([]);
  expect(
    await database.db
      .select()
      .from(attendanceAttempts)
      .where(eq(attendanceAttempts.assignmentId, slot.id)),
  ).toEqual(before);
});
it('shows explicit superior decisions without granting ADMIN/HR approval authority', async () => {
  const requester = await person(),
    superior = await person(),
    director = await person();
  await database.db
    .update(employees)
    .set({ supervisorId: superior.employee.id })
    .where(eq(employees.id, requester.employee.id));
  const [head] = await database.db
    .insert(assignments)
    .values({
      kind: 'HEAD',
      employeeId: requester.employee.id,
      departmentId: requester.employee.departmentId,
      startsAt: new Date('2020-01-01'),
      reason: 'Test',
      createdBy: admin.session.user.id,
    })
    .returning();
  const [direction] = await database.db
    .insert(assignments)
    .values({
      kind: 'DIRECTOR',
      employeeId: director.employee.id,
      startsAt: new Date('2020-01-01'),
      reason: 'Test',
      createdBy: admin.session.user.id,
    })
    .returning();
  const [r] = await database.db
    .insert(leaveRequests)
    .values({
      kind: 'PERMISSION',
      employeeId: requester.employee.id,
      departmentId: requester.employee.departmentId,
      reason: 'Privado',
      fromDate: '2030-01-20',
      toDate: '2030-01-20',
      headMode: 'SUPERVISOR',
      createdAt: new Date(),
      createdBy: requester.user.id,
    })
    .returning();
  const dashboard = createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-10T15:00Z'),
  });
  const result = await dashboard.get(await scope(superior.account));
  expect(result.teamVisible).toBe(false);
  expect(result.pendingRequests.find((x) => x.id === r!.id)?.canDecide).toBe(
    true,
  );
  for (const account of [admin, hr, requester.account])
    expect(
      (await dashboard.get(await scope(account))).pendingRequests.find(
        (x) => x.id === r!.id,
      )?.canDecide,
    ).not.toBe(true);
  await database.db
    .update(leaveRequests)
    .set({ status: 'PENDING_DIRECTOR', approvalFlow: 'HEAD_DIRECTOR' })
    .where(eq(leaveRequests.id, r!.id));
  expect(
    (await dashboard.get(await scope(director.account))).pendingRequests.find(
      (x) => x.id === r!.id,
    )?.canDecide,
  ).toBe(true);
  await database.db
    .update(assignments)
    .set({ revokedAt: new Date() })
    .where(eq(assignments.id, direction!.id));
  expect(
    (await dashboard.get(await scope(director.account))).pendingRequests.find(
      (x) => x.id === r!.id,
    )?.canDecide,
  ).not.toBe(true);
  await database.db
    .update(assignments)
    .set({ revokedAt: new Date() })
    .where(eq(assignments.id, head!.id));
});
it('reports approved full-turn coverage separately from missing punches without creating controls', async () => {
  const own = await person();
  const slot = await shift(own.employee.id);
  await database.db.insert(leaveRequests).values({
    kind: 'PERMISSION',
    status: 'APPROVED',
    employeeId: own.employee.id,
    departmentId: own.employee.departmentId,
    reason: 'Privado',
    fromDate: slot.workDate,
    toDate: slot.workDate,
    headMode: 'DEPARTMENT',
    createdAt: new Date(),
    createdBy: own.user.id,
    resolvedAt: new Date(),
  });
  const data = await createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-10T15:00Z'),
  }).get(await scope(own.account));
  expect(data.attendance.shifts[0]).toMatchObject({
    authorizedAbsence: true,
    entry: false,
    evaluation: null,
  });
  expect(
    await database.db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.assignmentId, slot.id)),
  ).toEqual([]);
});
it('keeps the previous night shift visible through its exit window ahead of a future turn', async () => {
  const own = await person();
  const night = await shift(
    own.employee.id,
    '2030-01-10T22:00:00Z',
    '2030-01-11T06:00:00Z',
  );
  await shift(own.employee.id, '2030-01-11T22:00:00Z', '2030-01-12T06:00:00Z');
  const data = await createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-11T06:01Z'),
  }).get(await scope(own.account));
  expect(data.personal?.shift).toMatchObject({
    id: night.id,
    phase: 'IN_PROGRESS',
    exit: false,
  });
});
it('saves changed attendance settings via HR with CSRF and preserves prior policies and controls', async () => {
  const before = (
    await app.inject({ url: '/api/attendance/policy', headers: hr.headers })
  ).json();
  const controls = await database.db.select().from(attendanceSessions);
  const update = {
    lateToleranceMinutes: 11,
    earlyEntryMinutes: 37,
    lateExitMinutes: 125,
  };
  expect(
    (
      await app.inject({
        url: '/api/attendance/policy',
        method: 'PUT',
        headers: { cookie: hr.cookie },
        payload: update,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({
        url: '/api/attendance/policy',
        method: 'PUT',
        headers: hr.headers,
        payload: update,
      })
    ).statusCode,
  ).toBe(200);
  const after = (
    await app.inject({ url: '/api/attendance/policy', headers: hr.headers })
  ).json();
  expect(after).toMatchObject({ ...update, version: before.version + 1 });
  expect(await database.db.select().from(attendanceSessions)).toEqual(controls);
  expect(
    (
      await database.pool.query(
        'select late_tolerance_minutes from attendance_policies where id=$1',
        [before.id],
      )
    ).rows[0].late_tolerance_minutes,
  ).toBe(before.lateToleranceMinutes);
});
it('prioritizes the scheduled current turn over the previous exit window', async () => {
  const own = await person();
  await shift(own.employee.id, '2030-01-09T22:00:00Z', '2030-01-10T06:00:00Z');
  const current = await shift(
    own.employee.id,
    '2030-01-10T06:00:00Z',
    '2030-01-10T14:00:00Z',
  );
  const data = await createDashboardService(database.db, {
    timeZone: 'America/Merida',
    clock: () => new Date('2030-01-10T06:01Z'),
  }).get(await scope(own.account));
  expect(data.personal?.shift?.id).toBe(current.id);
});
