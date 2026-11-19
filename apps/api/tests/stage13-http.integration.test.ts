import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('Se requiere base _test.');
const control = createDatabase(source);
const databaseName = `asistencia_http13_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(source);
url.pathname = `/${databaseName}`;
const database = createDatabase(url.toString());
const app = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
let created = false;
let auth: Awaited<ReturnType<typeof login>>;
let other: Awaited<ReturnType<typeof login>>;
let userId: string;
beforeAll(async () => {
  await control.pool.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  await runMigrations(database.db);
  const identity = createIdentityService(database.db);
  const admin = await identity.createInitialAdmin({
    email: 'clock@example.test',
    name: 'Marcaje HTTP',
    password: TEST_PASSWORD,
  });
  userId = admin.id;
  auth = await login(app, admin.email);
  const member = await identity.createUser({
    email: 'other-clock@example.test',
    name: 'Otro usuario',
    password: TEST_PASSWORD,
    active: true,
    roles: ['EMPLOYEE'],
  });
  other = await login(app, member.email);
});
afterAll(async () => {
  await app.close();
  await database.pool.end();
  try {
    if (created) await control.pool.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    await control.pool.end();
  }
});
async function post(path: string, payload: object) {
  return app.inject({
    method: 'POST',
    url: `/api/${path}`,
    headers: auth.headers,
    payload,
  });
}
it('devuelve contexto sin empleado, política y bloquea configuración ajena/CSRF', async () => {
  expect((await app.inject('/api/attendance/me')).statusCode).toBe(401);
  const me = await app.inject({
    url: '/api/attendance/me',
    headers: auth.headers,
  });
  expect(me.statusCode).toBe(200);
  expect(me.json().employee).toBeNull();
  expect(me.json().items).toEqual([]);
  const body = {
    lateToleranceMinutes: 10,
    earlyEntryMinutes: 30,
    lateExitMinutes: 120,
  };
  expect(me.json().policy).toMatchObject(body);
  expect(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/attendance/policy',
        headers: other.headers,
        payload: body,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/attendance/policy',
        headers: { cookie: auth.cookie },
        payload: body,
      })
    ).statusCode,
  ).toBe(403);
});
it('usa hora servidor, marca solo propio y reintenta sin duplicar ni conservar GPS home office', async () => {
  const dep = await post('departments', { name: `HTTP13 ${randomUUID()}` });
  const employee = await post('employees', {
    fullName: 'Persona HTTP',
    departmentId: dep.json().id,
    position: 'Operación',
    joinedOn: '2026-11-01',
    category: 'OPERATIONAL',
    status: 'ACTIVE',
    supervisorId: null,
    userId,
  });
  expect(employee.statusCode).toBe(201);
  const start = new Date(Date.now() - 5 * 60000),
    end = new Date(Date.now() + 60 * 60000);
  const template = await post('shift-templates', {
    name: `Actual ${randomUUID()}`,
    category: 'OPERATIONAL',
    modality: 'HOME_OFFICE',
    startTime: start.toISOString().slice(11, 16),
    endTime: end.toISOString().slice(11, 16),
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    timeZone: 'UTC',
    active: true,
  });
  expect(template.statusCode).toBe(201);
  const slot = await post('schedule-assignments', {
    employeeId: employee.json().id,
    templateId: template.json().id,
    workDate: start.toISOString().slice(0, 10),
    kind: 'DUTY',
    locationId: null,
  });
  expect(slot.statusCode).toBe(201);
  expect(
    (await post(`schedule-assignments/${slot.json().id}/publish`, {}))
      .statusCode,
  ).toBe(200);
  const input = {
    assignmentId: slot.json().id,
    direction: 'ENTRY',
    idempotencyKey: randomUUID(),
  };
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/attendance/punches',
        headers: other.headers,
        payload: input,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await post('attendance/punches', {
        ...input,
        recordedAt: '2000-01-01T00:00:00Z',
      })
    ).statusCode,
  ).toBe(400);
  const before = Date.now();
  const first = await post('attendance/punches', {
    ...input,
    latitude: 21,
    longitude: -89,
    accuracy: 1,
  });
  expect(first.statusCode).toBe(200);
  expect(first.json().attempt.accepted).toBe(true);
  expect(Date.parse(first.json().attempt.recordedAt)).toBeGreaterThanOrEqual(
    before,
  );
  expect(Date.parse(first.json().attempt.recordedAt)).toBeLessThanOrEqual(
    Date.now(),
  );
  const again = await post('attendance/punches', input);
  expect(again.statusCode).toBe(200);
  expect(again.json().attempt.id).toBe(first.json().attempt.id);
  const exit = {
    ...input,
    direction: 'EXIT',
    idempotencyKey: randomUUID(),
    reason: 'Salida anticipada de prueba.',
  };
  const replies = await Promise.all([
    post('attendance/punches', exit),
    post('attendance/punches', exit),
  ]);
  expect(replies.map((r) => r.statusCode)).toEqual([200, 200]);
  expect(replies[0]!.json().attempt.id).toBe(replies[1]!.json().attempt.id);
  expect(
    (
      await database.pool.query(
        'select count(*)::int as count from attendance_attempts where assignment_id=$1',
        [slot.json().id],
      )
    ).rows,
  ).toEqual([{ count: 2 }]);
  expect(
    (
      await database.pool.query(
        'select id from geo_checks where employee_id=$1',
        [employee.json().id],
      )
    ).rows,
  ).toEqual([]);
  expect(
    (
      await post(`schedule-assignments/${slot.json().id}/cancel`, {
        reason: 'No ocultar marcajes',
      })
    ).statusCode,
  ).toBe(409);
});
