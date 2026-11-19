import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page, TestInfo } from '@playwright/test';
import type {
  EmployeeView,
  ScheduleAssignmentView,
  ShiftTemplateView,
} from '../../packages/contracts/src/index.js';
import type {
  AttendancePunchResult,
  AttendanceSummary,
} from '../../packages/contracts/src/attendance.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { test, expect } from './fixtures.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('E2E requiere TEST_DATABASE_URL terminada en _test.');
const origin = 'http://127.0.0.1:5183';
const center = { latitude: 21.0364532482013, longitude: -89.62273424224803 };

async function setup(request: APIRequestContext) {
  const database = createDatabase(databaseUrl as string);
  const ids = {
    departments: [] as string[],
    employees: [] as string[],
    templates: [] as string[],
    locations: [] as string[],
  };
  const response = await request.get('/api/auth/session');
  expect(response.status()).toBe(200);
  const session = await response.json();
  const headers = { origin, 'x-csrf-token': session.csrfToken };
  async function create<T extends { id: string }>(
    path: string,
    data: object,
    track?: string[],
  ): Promise<T> {
    const result = await request.post(`/api/${path}`, { headers, data });
    const body = await result.json();
    if (result.status() === 201 && track) track.push(body.id);
    expect(result.status(), JSON.stringify(body)).toBe(201);
    return body as T;
  }
  return {
    database,
    headers,
    async seed(userId: string, onsite: boolean) {
      const suffix = randomUUID().slice(0, 8);
      const department = await create<{ id: string }>(
        'departments',
        { name: `Asistencia ${suffix}` },
        ids.departments,
      );
      const employee = await create<EmployeeView>(
        'employees',
        {
          fullName: `Asistencia ${suffix}`,
          departmentId: department.id,
          userId,
          category: onsite ? 'ADMINISTRATIVE' : 'OPERATIONAL',
          position: 'Analista E2E',
          joinedOn: '2024-01-01',
          status: 'ACTIVE',
          supervisorId: null,
          phoneNumber: '+529991234567',
          address: 'Domicilio privado E2E',
        },
        ids.employees,
      );
      let locationId: string | null = null;
      if (onsite) {
        const location = await create<{ id: string }>(
          'locations',
          {
            name: `Sede asistencia ${suffix}`,
            ...center,
            radiusMeters: 10,
            maxAccuracyMeters: 10,
            active: true,
          },
          ids.locations,
        );
        locationId = location.id;
        await create('location-authorizations', {
          employeeId: employee.id,
          locationId,
          startsOn: '2020-01-01',
          endsOn: null,
        });
      }
      // Read the real server clock; never submit a client-controlled punch time.
      const clock = await request.get('/api/attendance/me');
      expect(clock.status()).toBe(200);
      const serverTime: string = (await clock.json()).serverTime;
      const now = new Date(serverTime);
      expect(Number.isFinite(now.getTime())).toBe(true);
      const start = new Date(now.getTime() - 2 * 60_000);
      const end = new Date(now.getTime() + 30 * 60_000);
      const workDate = start.toISOString().slice(0, 10);
      const template = await create<ShiftTemplateView>(
        'shift-templates',
        {
          name: `Jornada asistencia ${suffix}`,
          category: employee.category,
          modality: onsite ? 'ONSITE' : 'HOME_OFFICE',
          startTime: start.toISOString().slice(11, 16),
          endTime: end.toISOString().slice(11, 16),
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          timeZone: 'UTC',
          active: true,
        },
        ids.templates,
      );
      const draft = await create<ScheduleAssignmentView>(
        'schedule-assignments',
        {
          employeeId: employee.id,
          templateId: template.id,
          workDate,
          kind: 'DUTY',
          locationId,
        },
      );
      const publishing = await request.post(
        `/api/schedule-assignments/${draft.id}/publish`,
        { headers },
      );
      expect(publishing.status()).toBe(200);
      const assignment: ScheduleAssignmentView = await publishing.json();
      expect(assignment.status).toBe('PUBLISHED');
      return { employee, assignment, workDate, locationId };
    },
    async summary(workDate: string, assignmentId: string) {
      const result = await request.get(
        `/api/attendance/summary?from=${workDate}&to=${workDate}`,
      );
      expect(result.status()).toBe(200);
      const body: AttendanceSummary = await result.json();
      const item = body.items.find(
        (item) => item.assignmentId === assignmentId,
      );
      expect(item).toBeDefined();
      return item!;
    },
    async cleanup() {
      try {
        // Delete only this test's employees and their dependent attendance history.
        if (ids.employees.length) {
          await database.pool.query(
            'delete from attendance_reasons where incident_id in (select id from attendance_incidents where employee_id = any($1::uuid[]))',
            [ids.employees],
          );
          await database.pool.query(
            'delete from attendance_evaluations where session_id in (select id from attendance_sessions where employee_id = any($1::uuid[]))',
            [ids.employees],
          );
          for (const table of [
            'attendance_incidents',
            'attendance_attempts',
            'attendance_sessions',
          ])
            await database.pool.query(
              `delete from ${table} where employee_id = any($1::uuid[])`,
              [ids.employees],
            );
          for (const table of [
            'geo_checks',
            'schedule_assignments',
            'location_authorizations',
          ])
            await database.pool.query(
              `delete from ${table} where employee_id = any($1::uuid[])`,
              [ids.employees],
            );
          await database.pool.query(
            'delete from employees where id = any($1::uuid[])',
            [ids.employees],
          );
        }
        for (const [table, tracked] of [
          ['shift_templates', ids.templates],
          ['work_locations', ids.locations],
          ['departments', ids.departments],
        ] as const)
          if (tracked.length)
            await database.pool.query(
              `delete from ${table} where id = any($1::uuid[])`,
              [tracked],
            );
      } finally {
        await database.pool.end();
      }
    },
  };
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
  });
}

async function selectAssignment(page: Page, assignmentId: string) {
  await page.goto('/asistencia');
  await expect(
    page.getByRole('heading', { name: 'Asistencia', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Turno publicado', exact: true })
    .selectOption(assignmentId);
}

async function punch(page: Page, direction: 'ENTRY' | 'EXIT') {
  const pending = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/attendance/punches') &&
      response.request().method() === 'POST',
  );
  await page
    .getByRole('button', {
      name: direction === 'ENTRY' ? 'Registrar entrada' : 'Registrar salida',
      exact: true,
    })
    .click();
  const response = await pending;
  expect(response.ok()).toBe(true);
  return response.request().postDataJSON() as {
    assignmentId: string;
    direction: 'ENTRY' | 'EXIT';
    idempotencyKey: string;
  };
}

async function saveReason(page: Page, workDate: string, reason: string) {
  await page.goto('/incidencias');
  await expect(
    page.getByRole('heading', { name: 'Incidencias', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Desde', { exact: true }).fill(workDate);
  await page.getByLabel('Hasta', { exact: true }).fill(workDate);
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.getByLabel('Motivo', { exact: true }).fill(reason);
  const pending = page.waitForResponse(
    (response) =>
      /\/api\/attendance\/incidents\/[^/]+\/reason$/.test(response.url()) &&
      response.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: 'Guardar motivo', exact: true })
    .click();
  expect((await pending).ok()).toBe(true);
  await expect(page.getByText(reason, { exact: false })).toBeVisible();
}

test('marca home office sin GPS y conserva salida anticipada con motivo pendiente', async ({
  page,
  account,
}, testInfo) => {
  const own = await setup(page.request);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const state = globalThis as typeof globalThis & {
      attendanceGeoCalls: number;
    };
    state.attendanceGeoCalls = 0;
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition() {
          state.attendanceGeoCalls++;
          throw new Error('Home office no debe solicitar GPS');
        },
        watchPosition() {
          state.attendanceGeoCalls++;
          throw new Error('Home office no debe observar GPS');
        },
      },
    });
  });
  try {
    const { employee, assignment, workDate } = await own.seed(
      account.id,
      false,
    );
    await selectAssignment(page, assignment.id);
    const beforeEntry = Date.now();
    const entryRequest = await punch(page, 'ENTRY');
    let summary = await own.summary(workDate, assignment.id);
    expect(summary.attempts).toHaveLength(1);
    expect(summary.attempts[0]).toMatchObject({
      employeeId: employee.id,
      direction: 'ENTRY',
      accepted: true,
      geoCheckId: null,
    });
    expect(Date.parse(summary.attempts[0]!.recordedAt)).toBeGreaterThanOrEqual(
      beforeEntry - 2_000,
    );
    expect(Date.parse(summary.attempts[0]!.recordedAt)).toBeLessThanOrEqual(
      Date.now() + 2_000,
    );
    const retry = await page.request.post('/api/attendance/punches', {
      headers: own.headers,
      data: entryRequest,
    });
    expect(retry.ok()).toBe(true);
    const retried: AttendancePunchResult = await retry.json();
    expect(retried.attempt.id).toBe(summary.attempts[0]!.id);
    await punch(page, 'EXIT');
    summary = await own.summary(workDate, assignment.id);
    expect(summary.attempts).toHaveLength(2);
    expect(
      summary.attempts
        .filter((attempt) => attempt.accepted)
        .map((attempt) => attempt.direction)
        .sort(),
    ).toEqual(['ENTRY', 'EXIT']);
    expect(
      summary.attempts.every((attempt) => attempt.geoCheckId === null),
    ).toBe(true);
    const incident = summary.incidents.find(
      (item) => item.kind === 'EARLY_EXIT',
    );
    expect(incident).toMatchObject({
      employeeId: employee.id,
      requiresReason: true,
      reasons: [],
    });
    expect(
      await page.evaluate(
        () =>
          (globalThis as typeof globalThis & { attendanceGeoCalls: number })
            .attendanceGeoCalls,
      ),
    ).toBe(0);
    await capture(page, testInfo, 'asistencia-home-office');
    const reason = 'Salida anticipada por asunto personal E2E';
    await saveReason(page, workDate, reason);
    await capture(page, testInfo, 'incidencias-home-office');
    const persisted = await own.summary(workDate, assignment.id);
    expect(persisted.attempts).toEqual(summary.attempts);
    expect(
      persisted.incidents.find((item) => item.id === incident!.id)?.reasons,
    ).toEqual([expect.objectContaining({ reason })]);
    expect(persisted.summary).not.toMatch(/APPROVED|APROBADA/i);
    const raw = await own.database.pool.query(
      'select direction, accepted, geo_check_id from attendance_attempts where employee_id=$1',
      [employee.id],
    );
    expect(raw.rows).toHaveLength(2);
    expect(
      raw.rows.every(
        (row: { accepted: boolean; geo_check_id: string | null }) =>
          row.accepted && row.geo_check_id === null,
      ),
    ).toBe(true);
    const geo = await own.database.pool.query(
      'select id from geo_checks where employee_id=$1',
      [employee.id],
    );
    expect(geo.rows).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await own.cleanup();
  }
});

test('conserva rechazo presencial, captura motivo y acepta GPS del centro asignado', async ({
  page,
  context,
  account,
}, testInfo) => {
  const own = await setup(page.request);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const { employee, assignment, workDate, locationId } = await own.seed(
      account.id,
      true,
    );
    await context.grantPermissions(['geolocation'], { origin });
    await context.setGeolocation({
      latitude: center.latitude + 0.01,
      longitude: center.longitude,
      accuracy: 5,
    });
    await selectAssignment(page, assignment.id);
    await punch(page, 'ENTRY');
    const rejected = await own.summary(workDate, assignment.id);
    expect(rejected.attempts).toHaveLength(1);
    expect(rejected.attempts[0]).toMatchObject({
      employeeId: employee.id,
      direction: 'ENTRY',
      accepted: false,
      rejectionCode: 'OUTSIDE_GEOFENCE',
    });
    expect(rejected.attempts[0]!.geoCheckId).not.toBeNull();
    expect(rejected.incidents).toHaveLength(1);
    expect(rejected.incidents[0]).toMatchObject({
      requiresReason: true,
      reasons: [],
    });
    await capture(page, testInfo, 'asistencia-presencial-rechazada');
    const reason = 'Primer intento realizado fuera del centro E2E';
    await saveReason(page, workDate, reason);
    await capture(page, testInfo, 'incidencias-presencial');
    await context.setGeolocation({ ...center, accuracy: 5 });
    await selectAssignment(page, assignment.id);
    await punch(page, 'ENTRY');
    const persisted = await own.summary(workDate, assignment.id);
    expect(persisted.attempts).toHaveLength(2);
    expect(
      persisted.attempts.find(
        (attempt) => attempt.id === rejected.attempts[0]!.id,
      ),
    ).toEqual(rejected.attempts[0]);
    const accepted = persisted.attempts.filter((attempt) => attempt.accepted);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({
      direction: 'ENTRY',
      employeeId: employee.id,
      rejectionCode: null,
    });
    expect(accepted[0]!.geoCheckId).not.toBeNull();
    expect(accepted[0]!.geoCheckId).not.toBe(rejected.attempts[0]!.geoCheckId);
    expect(persisted.incidents[0]!.reasons).toEqual([
      expect.objectContaining({ reason }),
    ]);
    const raw = await own.database.pool.query(
      'select a.accepted, g.result, g.location_id from attendance_attempts a join geo_checks g on g.id=a.geo_check_id where a.employee_id=$1 order by a.accepted',
      [employee.id],
    );
    expect(raw.rows).toEqual([
      { accepted: false, result: 'OUTSIDE_GEOFENCE', location_id: locationId },
      { accepted: true, result: 'VALID', location_id: locationId },
    ]);
    const publicHistory = JSON.stringify(persisted);
    for (const privateField of [
      'latitude',
      'longitude',
      'phoneNumber',
      'address',
      '+529991234567',
      'Domicilio privado E2E',
    ])
      expect(publicHistory).not.toContain(privateField);
    await capture(page, testInfo, 'asistencia-presencial-aceptada');
    await context.setGeolocation({
      latitude: center.latitude + 0.01,
      longitude: center.longitude,
      accuracy: 5,
    });
    await punch(page, 'EXIT');
    const rejectedExit = await own.summary(workDate, assignment.id);
    expect(rejectedExit.attempts.filter((a) => a.direction === 'EXIT')).toEqual(
      [
        expect.objectContaining({
          accepted: false,
          rejectionCode: 'OUTSIDE_GEOFENCE',
          geoCheckId: expect.any(String),
        }),
      ],
    );
    await saveReason(page, workDate, 'Salida intentada fuera del centro E2E');
    await context.setGeolocation({ ...center, accuracy: 5 });
    await selectAssignment(page, assignment.id);
    await punch(page, 'EXIT');
    const finished = await own.summary(workDate, assignment.id);
    const validExit = finished.attempts.find(
      (a) => a.direction === 'EXIT' && a.accepted,
    );
    expect(validExit?.geoCheckId).toEqual(expect.any(String));
    expect(validExit?.geoCheckId).not.toBe(accepted[0]!.geoCheckId);
    expect(finished.incidents.some((i) => i.kind === 'EARLY_EXIT')).toBe(true);
    await capture(page, testInfo, 'asistencia-presencial-salida');
    expect(errors).toEqual([]);
  } finally {
    await own.cleanup();
  }
});

test('acepta entrada administrativa con falta tardía justificable y conserva motivo y GPS', async ({
  page,
  context,
  account,
}, info) => {
  const own = await setup(page.request);
  try {
    const { employee, assignment } = await own.seed(account.id, true);
    const start = new Date(Date.parse(assignment.startsAt) - 30 * 60000);
    const workDate = start.toISOString().slice(0, 10);
    await own.database.pool.query(
      'update schedule_assignments set starts_at=$2,work_date=$3 where id=$1',
      [assignment.id, start, workDate],
    );
    const policyResponse = await page.request.get('/api/attendance/policy');
    const policy = await policyResponse.json();
    // Isolated frozen control avoids changing the shared policy of other E2E cases.
    await own.database.pool.query(
      'insert into attendance_sessions(assignment_id,employee_id,policy_snapshot,created_at) values($1,$2,$3::jsonb,now())',
      [
        assignment.id,
        employee.id,
        JSON.stringify({ ...policy, administrativeAbsenceMinutes: 30 }),
      ],
    );
    await context.grantPermissions(['geolocation'], { origin });
    await context.setGeolocation({ ...center, accuracy: 5 });
    await selectAssignment(page, assignment.id);
    await punch(page, 'ENTRY');
    const persisted = await own.summary(workDate, assignment.id);
    expect(persisted.attempts[0]).toMatchObject({
      accepted: true,
      direction: 'ENTRY',
      rejectionCode: null,
    });
    expect(persisted.attempts[0]!.geoCheckId).not.toBeNull();
    expect(persisted.incidents.map((i) => i.kind)).toEqual(['LATE_ABSENCE']);
    const original = persisted.attempts[0];
    await saveReason(
      page,
      workDate,
      'Motivo de entrada tardía para revisión de jefatura',
    );
    await expect(
      page.getByText(
        'Falta por llegada tardía (justificable) · Pendiente de revisión',
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    const after = await own.summary(workDate, assignment.id);
    expect(after.attempts[0]).toEqual(original);
    expect(after.incidents[0]!.reasons).toHaveLength(1);
    expect(after.incidents[0]!.resolution).toBeNull();
    await capture(page, info, 'falta-tardia-marcaje-aceptado');
  } finally {
    await own.cleanup();
  }
});
