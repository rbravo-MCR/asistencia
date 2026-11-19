import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SessionView } from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { createAttendanceService } from '../src/modules/attendance/index.js';
import { createPlanningService } from '../src/modules/planning/index.js';
import {
  attendancePolicies,
  attendanceEvaluations,
  attendanceIncidents,
} from '../src/modules/attendance/schema.js';
import { employees } from '../src/modules/employees/schema.js';
import { departments } from '../src/modules/departments/schema.js';
import {
  shiftTemplates,
  scheduleAssignments,
} from '../src/modules/planning/schema.js';
import { leaveRequests } from '../src/modules/requests/schema.js';
import { TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Solo base _test.');
const control = createDatabase(source);
const name = `leave_attendance_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
const now = new Date('2030-01-16T14:00:00Z');
const attendance = createAttendanceService(database.db, { clock: () => now });
let departmentId: string, templateId: string;
let created = false;
const template = {
  name: 'Remoto',
  category: 'OPERATIONAL' as const,
  modality: 'HOME_OFFICE' as const,
  startTime: '08:00',
  endTime: '16:00',
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  timeZone: 'America/Merida',
  active: true,
};
beforeAll(async () => {
  await control.pool.query(`CREATE DATABASE "${name}"`);
  created = true;
  await runMigrations(database.db);
  await database.db
    .update(attendancePolicies)
    .set({ activatedAt: new Date('2029-01-01T00:00:00Z') });
  const [dep] = await database.db
    .insert(departments)
    .values({ name: 'Integración ausencias' })
    .returning();
  departmentId = dep!.id;
  const [t] = await database.db
    .insert(shiftTemplates)
    .values(template)
    .returning();
  templateId = t!.id;
});
afterAll(async () => {
  await database.pool.end();
  try {
    if (created) await control.pool.query(`DROP DATABASE "${name}"`);
  } finally {
    await control.pool.end();
  }
});
async function fixture(
  status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED',
  workDate = '2030-01-15',
) {
  const user = await createIdentityService(database.db).createUser({
    email: `${randomUUID()}@example.test`,
    name: 'Empleado integración',
    password: TEST_PASSWORD,
    roles: ['EMPLOYEE'],
    active: true,
  });
  const [employee] = await database.db
    .insert(employees)
    .values({
      employeeNumber: randomUUID().slice(0, 12),
      fullName: 'Persona con ausencia',
      departmentId,
      position: 'Operador',
      joinedOn: '2028-01-01',
      category: 'OPERATIONAL',
      userId: user.id,
    })
    .returning();
  const [slot] = await database.db
    .insert(scheduleAssignments)
    .values({
      employeeId: employee!.id,
      templateId,
      workDate,
      kind: 'REGULAR',
      templateVersion: 1,
      startsAt: new Date(`${workDate}T14:00:00Z`),
      endsAt: new Date(`${workDate}T22:00:00Z`),
      modality: 'HOME_OFFICE',
      locationId: null,
      timeZone: 'America/Merida',
      templateName: 'Remoto',
      snapshot: { ...template, version: 1 },
      status,
      publishedAt:
        status === 'PUBLISHED' ? new Date('2029-12-01T00:00:00Z') : null,
    })
    .returning();
  const scope: SessionView = {
    user,
    csrfToken: '',
    expiresAt: '2031-01-01T00:00:00Z',
    employeeId: employee!.id,
    departmentIds: [departmentId],
    managedDepartmentIds: [],
    permissions: {
      manageUsers: false,
      manageOrganization: false,
      viewAllEmployees: false,
    },
  };
  return { employee: employee!, slot: slot!, scope, user };
}
async function approved(
  f: Awaited<ReturnType<typeof fixture>>,
  extra: Partial<typeof leaveRequests.$inferInsert> = {},
) {
  const [r] = await database.db
    .insert(leaveRequests)
    .values({
      employeeId: f.employee.id,
      departmentId,
      kind: 'PERMISSION',
      status: 'APPROVED',
      reason:
        'Fixture aprobada aislada; motor de decisiones probado en requests.integration',
      fromDate: f.slot.workDate,
      toDate: f.slot.workDate,
      headMode: 'DEPARTMENT',
      createdBy: f.user.id,
      createdAt: new Date('2029-12-01T00:00:00Z'),
      resolvedAt: new Date('2029-12-02T00:00:00Z'),
      ...extra,
    })
    .returning();
  return r!;
}
it('full approved leave evaluates separately without inventing an absence incident', async () => {
  const f = await fixture();
  await approved(f);
  await attendance.evaluate('2030-01-15', '2030-01-15');
  const [item] = await attendance.summary('2030-01-15', '2030-01-15', f.scope);
  expect(item!.evaluations).toEqual([
    expect.objectContaining({ result: 'AUTHORIZED_ABSENCE' }),
  ]);
  expect(item!.incidents).toHaveLength(0);
});
it('partial permission never exempts a whole missing shift', async () => {
  const f = await fixture();
  await approved(f, {
    partialStartsAt: new Date('2030-01-15T15:00:00Z'),
    partialEndsAt: new Date('2030-01-15T16:00:00Z'),
  });
  await attendance.evaluate('2030-01-15', '2030-01-15');
  const [item] = await attendance.summary('2030-01-15', '2030-01-15', f.scope);
  expect(item!.evaluations[0]!.result).toBe('ABSENCE');
  expect(item!.incidents[0]!.kind).toBe('ABSENCE');
});
it('approval after an absence preserves its evaluation and releases only its resolved reason requirement', async () => {
  const f = await fixture();
  await attendance.evaluate('2030-01-15', '2030-01-15');
  const before = await database.db.select().from(attendanceEvaluations);
  expect((await attendance.me(f.scope)).pendingIncidents).toHaveLength(1);
  const r = await approved(f);
  expect((await attendance.me(f.scope)).pendingIncidents).toEqual([]);
  const [item] = await attendance.summary('2030-01-15', '2030-01-15', f.scope);
  expect(item!.incidents[0]).toMatchObject({
    kind: 'ABSENCE',
    requiresReason: false,
    resolution: { requestId: r.id },
  });
  expect(await database.db.select().from(attendanceEvaluations)).toEqual(
    before,
  );
  const next = await fixture();
  expect((await attendance.me(next.scope)).pendingIncidents).toEqual([]);
});
it('an approved justification resolves its incident without rewriting the original incident', async () => {
  const f = await fixture();
  await attendance.evaluate('2030-01-15', '2030-01-15');
  const [incident] = await database.db
    .select()
    .from(attendanceIncidents)
    .where(eq(attendanceIncidents.employeeId, f.employee.id));
  const original = { ...incident! };
  const r = await approved(f, {
    kind: 'JUSTIFICATION',
    incidentId: incident!.id,
  });
  const [item] = await attendance.summary('2030-01-15', '2030-01-15', f.scope);
  expect(item!.incidents[0]).toMatchObject({
    requiresReason: false,
    resolution: { requestId: r.id },
  });
  const [unchanged] = await database.db
    .select()
    .from(attendanceIncidents)
    .where(eq(attendanceIncidents.id, incident!.id));
  expect(unchanged).toEqual(original);
});
it('cancelled leave provides no exemption to attendance', async () => {
  const f = await fixture();
  await approved(f, { status: 'CANCELLED' });
  await attendance.evaluate('2030-01-15', '2030-01-15');
  const [item] = await attendance.summary('2030-01-15', '2030-01-15', f.scope);
  expect(item!.evaluations[0]!.result).toBe('ABSENCE');
});
it('vacation covers charged civil work dates rather than excluded days', async () => {
  const f = await fixture('PUBLISHED', '2030-01-13');
  await approved(f, {
    kind: 'VACATION',
    fromDate: '2030-01-13',
    toDate: '2030-01-15',
    chargedDates: ['2030-01-14', '2030-01-15'],
    days: 2,
  });
  await attendance.evaluate('2030-01-13', '2030-01-13');
  const [item] = await attendance.summary('2030-01-13', '2030-01-13', f.scope);
  expect(item!.evaluations[0]!.result).toBe('ABSENCE');
});
it('planning refuses publication of a shift already covered by approved leave', async () => {
  const f = await fixture('DRAFT');
  await approved(f);
  await expect(
    createPlanningService(database.db).publishAssignment(f.slot.id),
  ).rejects.toMatchObject({ code: 'APPROVED_LEAVE_CONFLICT' });
});
it('approved leave does not replace a complete pair of actual attendance marks', async () => {
  const f = await fixture();
  await approved(f);
  const entry = createAttendanceService(database.db, {
    clock: () => f.slot.startsAt,
  });
  const exit = createAttendanceService(database.db, {
    clock: () => f.slot.endsAt,
  });
  await entry.punch(
    {
      assignmentId: f.slot.id,
      direction: 'ENTRY',
      idempotencyKey: randomUUID(),
    },
    f.scope,
  );
  await exit.punch(
    {
      assignmentId: f.slot.id,
      direction: 'EXIT',
      idempotencyKey: randomUUID(),
    },
    f.scope,
  );
  await attendance.evaluate(f.slot.workDate, f.slot.workDate);
  const [item] = await attendance.summary(
    f.slot.workDate,
    f.slot.workDate,
    f.scope,
  );
  expect(item!.evaluations[0]!.result).toBe('COMPLETE');
  expect(item!.attempts.filter((a) => a.accepted)).toHaveLength(2);
});
