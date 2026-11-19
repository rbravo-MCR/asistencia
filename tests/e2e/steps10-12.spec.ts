import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page, TestInfo } from '@playwright/test';
import type {
  EmployeeView,
  GeoCheckView,
  NotificationView,
  ScheduleAssignmentView,
  ShiftTemplateView,
} from '../../packages/contracts/src/index.js';
import { test, expect } from './fixtures.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('E2E requiere TEST_DATABASE_URL terminada en _test.');

const origin = 'http://127.0.0.1:5183';
const center = { latitude: 21.0364532482013, longitude: -89.62273424224803 };

async function setup(request: APIRequestContext) {
  const database = createDatabase(databaseUrl as string);
  const departmentIds: string[] = [];
  const employeeIds: string[] = [];
  const templateIds: string[] = [];
  const locationIds: string[] = [];
  const sessionResponse = await request.get('/api/auth/session');
  expect(sessionResponse.status()).toBe(200);
  const session = await sessionResponse.json();
  const headers = { origin, 'x-csrf-token': session.csrfToken };
  async function create<T extends { id: string }>(
    path: string,
    data: object,
    ids: string[],
  ): Promise<T> {
    const response = await request.post(`/api/${path}`, { headers, data });
    const body = await response.json();
    if (response.status() === 201 && body.id) ids.push(body.id);
    expect(response.status(), JSON.stringify(body)).toBe(201);
    return body as T;
  }
  return {
    database,
    headers,
    department: (name: string) =>
      create<{ id: string }>('departments', { name }, departmentIds),
    employee: (data: object) =>
      create<EmployeeView>('employees', data, employeeIds),
    template: (data: object) =>
      create<ShiftTemplateView>('shift-templates', data, templateIds),
    location: (data: object) =>
      create<{ id: string }>('locations', data, locationIds),
    async cleanup() {
      try {
        for (const table of [
          'geo_checks',
          'schedule_assignments',
          'location_authorizations',
        ])
          if (employeeIds.length)
            await database.pool.query(
              `delete from ${table} where employee_id = any($1::uuid[])`,
              [employeeIds],
            );
        if (employeeIds.length)
          await database.pool.query(
            'delete from employees where id = any($1::uuid[])',
            [employeeIds],
          );
        if (templateIds.length)
          await database.pool.query(
            'delete from shift_templates where id = any($1::uuid[])',
            [templateIds],
          );
        if (locationIds.length)
          await database.pool.query(
            'delete from work_locations where id = any($1::uuid[])',
            [locationIds],
          );
        if (departmentIds.length)
          await database.pool.query(
            'delete from departments where id = any($1::uuid[])',
            [departmentIds],
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

function employeeInput(
  name: string,
  departmentId: string,
  userId: string,
  category: 'OPERATIONAL' | 'ADMINISTRATIVE',
) {
  return {
    fullName: name,
    departmentId,
    userId,
    category,
    position: 'Analista E2E',
    joinedOn: '2024-01-01',
    status: 'ACTIVE',
    supervisorId: null,
  };
}

test('publica turno, conserva snapshot y entrega aviso auditable', async ({
  page,
  account,
}, testInfo) => {
  test.setTimeout(60_000);
  const own = await setup(page.request);
  const suffix = randomUUID().slice(0, 8);
  const name = `OPS ${suffix}`;
  const templateInput = {
    name: `Turno ${suffix}`,
    category: 'OPERATIONAL',
    modality: 'HOME_OFFICE',
    startTime: '08:00',
    endTime: '16:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    timeZone: 'America/Merida',
    active: true,
  };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const department = await own.department(`Área ${suffix}`);
    const employee = await own.employee(
      employeeInput(name, department.id, account.id, 'OPERATIONAL'),
    );
    const template = await own.template(templateInput);
    await page.goto('/calendario');
    await expect(
      page.getByRole('heading', { name: 'Asignar turnos', exact: true }),
    ).toBeVisible();
    const month = await page.getByLabel('Mes', { exact: true }).inputValue();
    const workDate = `${month}-15`;
    await page
      .getByLabel('Empleado', { exact: true })
      .selectOption(employee.id);
    await page
      .getByRole('button', { name: 'Asignar turno', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Asignar turno', exact: true }),
    ).toBeVisible();
    await page
      .getByLabel('Empleado del turno', { exact: true })
      .selectOption(employee.id);
    await page
      .getByLabel('Plantilla', { exact: true })
      .selectOption(template.id);
    await page.getByLabel('Fecha de inicio', { exact: true }).fill(workDate);
    await page
      .getByLabel('Tipo de jornada', { exact: true })
      .selectOption('DUTY');
    const summary = page.getByRole('region', {
      name: 'Resumen de la asignación',
    });
    await expect(summary).toContainText(name);
    await expect(summary).toContainText(template.name);
    await expect(summary).toContainText(workDate);
    await expect(summary).toContainText('08:00–16:00');
    await expect(summary).toContainText('Home office');
    const creating = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/schedule-assignments') &&
        r.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Guardar borrador', exact: true })
      .click();
    const created = await creating;
    expect(created.status()).toBe(201);
    await expect(page).toHaveURL(`${origin}/calendario`);
    async function savedSlot() {
      const response = await page.request.get(
        `/api/schedule-assignments?from=${workDate}&to=${workDate}`,
      );
      expect(response.status()).toBe(200);
      const body: { items: ScheduleAssignmentView[] } = await response.json();
      const matches = body.items.filter(
        (item) =>
          item.employeeId === employee.id &&
          item.templateId === template.id &&
          item.workDate === workDate,
      );
      expect(matches).toHaveLength(1);
      return matches[0]!;
    }
    const draft = await savedSlot();
    expect(draft).toMatchObject({
      employeeId: employee.id,
      status: 'DRAFT',
      modality: 'HOME_OFFICE',
      locationId: null,
    });
    const slot = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(slot.getByText('Borrador', { exact: false })).toBeVisible();
    const publishing = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/schedule-assignments/${draft.id}/publish`) &&
        r.request().method() === 'POST',
    );
    await slot
      .getByRole('button', {
        name: `Publicar turno de ${name} del ${workDate}`,
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Confirmar publicación', exact: true })
      .click();
    const published = await publishing;
    expect(published.status()).toBe(200);
    const frozen = await savedSlot();
    expect(frozen.status).toBe('PUBLISHED');
    expect(frozen.publishedAt).not.toBeNull();
    const updating = await page.request.put(
      `/api/shift-templates/${template.id}`,
      {
        headers: own.headers,
        data: { ...templateInput, startTime: '09:00', endTime: '17:00' },
      },
    );
    expect(updating.status()).toBe(200);
    expect((await updating.json()).version).toBe(template.version + 1);
    await page.reload();
    await page
      .getByLabel('Empleado', { exact: true })
      .selectOption(employee.id);
    await expect(slot.getByText('Publicado', { exact: false })).toBeVisible();
    await expect(slot.getByText('08:00–16:00', { exact: false })).toBeVisible();
    const stored = await page.request.get(
      `/api/schedule-assignments?from=${workDate}&to=${workDate}`,
    );
    expect(stored.status()).toBe(200);
    const persisted = (await stored.json()).items.find(
      (item: ScheduleAssignmentView) => item.id === draft.id,
    );
    expect(persisted.snapshot).toEqual(frozen.snapshot);
    expect(persisted.templateVersion).toBe(template.version);
    await capture(page, testInfo, 'calendario');

    await expect
      .poll(
        async () => {
          const response = await page.request.get('/api/notifications');
          expect(response.status()).toBe(200);
          const notifications: { items: NotificationView[] } =
            await response.json();
          return notifications.items.some(
            (item) =>
              item.title === 'Horario publicado' &&
              item.message.includes(template.name),
          );
        },
        {
          timeout: 20_000,
          message: 'El worker real debe entregar el aviso publicado',
        },
      )
      .toBe(true);
    await page.goto('/avisos');
    const notice = page
      .getByRole('listitem')
      .filter({ hasText: `${template.name}: ${workDate}.` });
    await expect(
      notice.getByRole('heading', { name: 'Horario publicado', exact: false }),
    ).toBeVisible();
    await expect(
      notice.getByRole('link', { name: 'Ver detalle', exact: true }),
    ).toHaveAttribute('href', '/calendario');
    const reading = page.waitForResponse(
      (r) =>
        /\/api\/notifications\/[^/]+\/read$/.test(r.url()) &&
        r.request().method() === 'POST',
    );
    await notice
      .getByRole('button', {
        name: 'Marcar leído: Horario publicado',
        exact: true,
      })
      .click();
    expect((await reading).status()).toBe(204);
    await page.reload();
    await expect(
      notice.getByRole('button', {
        name: 'Marcar leído: Horario publicado',
        exact: true,
      }),
    ).toHaveCount(0);
    const inboxResponse = await page.request.get('/api/notifications');
    expect(inboxResponse.status()).toBe(200);
    const inbox = (await inboxResponse.json()) as { items: NotificationView[] };
    const persistedNotice = inbox.items.find(
      (item) =>
        item.title === 'Horario publicado' &&
        item.message.includes(`${template.name}: ${workDate}.`),
    );
    expect(persistedNotice?.readAt).toEqual(expect.any(String));
    await capture(page, testInfo, 'avisos');
    await notice
      .getByRole('link', { name: 'Ver detalle', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Asignar turnos', exact: true }),
    ).toBeVisible();

    await page.goto('/auditoria');
    await page
      .getByLabel('Entidad', { exact: true })
      .fill('scheduleAssignment');
    await page
      .getByLabel('Acción', { exact: true })
      .fill('planning.assignment.publish');
    await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
    const audit = page.getByRole('row').filter({ hasText: draft.id });
    await expect(
      audit.getByText('planning.assignment.publish', { exact: true }),
    ).toBeVisible();
    await expect(
      audit.getByText('scheduleAssignment', { exact: true }),
    ).toBeVisible();
    await audit
      .getByRole('button', {
        name: 'Ver cambios: planning.assignment.publish · scheduleAssignment',
        exact: true,
      })
      .click();
    const detail = page.getByRole('dialog', {
      name: 'Detalle de auditoría',
      exact: true,
    });
    await expect(
      detail.getByRole('heading', {
        name: 'planning.assignment.publish · scheduleAssignment',
        exact: true,
      }),
    ).toBeVisible();
    await expect(detail.getByText(draft.id, { exact: true })).toBeVisible();
    await expect(
      detail.locator('section').filter({
        has: page.getByRole('heading', { name: 'Después', exact: true }),
      }),
    ).toContainText('PUBLISHED');
    await capture(page, testInfo, 'auditoria');
    expect(errors).toEqual([]);
  } finally {
    await own.cleanup();
  }
});

test('comprueba GPS puntual y conserva rechazos sin marcajes', async ({
  page,
  context,
  account,
}, testInfo) => {
  test.setTimeout(60_000);
  const own = await setup(page.request);
  const suffix = randomUUID().slice(0, 8);
  try {
    const department = await own.department(`Centro ${suffix}`);
    const employee = await own.employee(
      employeeInput(
        `ADM ${suffix}`,
        department.id,
        account.id,
        'ADMINISTRATIVE',
      ),
    );
    const location = await own.location({
      name: `Sede ${suffix}`,
      ...center,
      radiusMeters: 10,
      maxAccuracyMeters: 10,
      active: true,
    });
    const authorization = await page.request.post(
      '/api/location-authorizations',
      {
        headers: own.headers,
        data: {
          employeeId: employee.id,
          locationId: location.id,
          startsOn: '2024-01-01',
          endsOn: null,
        },
      },
    );
    expect(authorization.status()).toBe(201);
    await context.grantPermissions(['geolocation'], { origin });
    await context.setGeolocation({ ...center, accuracy: 5 });
    await page.goto('/ubicaciones');
    await expect(
      page.getByRole('heading', { name: 'Centros de trabajo', exact: true }),
    ).toBeVisible();
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/'))
        mutations.push(new URL(request.url()).pathname);
    });
    const validating = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/locations/validate') &&
        r.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Comprobar mi ubicación', exact: true })
      .click();
    const validated = await validating;
    expect(validated.status()).toBe(200);
    const valid: GeoCheckView = await validated.json();
    expect(valid).toMatchObject({
      employeeId: employee.id,
      locationId: location.id,
      result: 'VALID',
    });
    expect(valid.distanceMeters).toBeLessThanOrEqual(10);
    await expect(
      page.getByText('Ubicación válida', { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('listitem')
        .filter({
          has: page.getByRole('heading', {
            name: `Sede ${suffix} · Activo`,
            exact: true,
          }),
        })
        .getByText('Radio: 10 m · Precisión máxima: 10 m', { exact: true }),
    ).toBeVisible();
    await capture(page, testInfo, 'ubicaciones');
    const saved = await own.database.pool.query(
      'select result, latitude, longitude, accuracy, policy_snapshot from geo_checks where id=$1 and employee_id=$2',
      [valid.id, employee.id],
    );
    expect(saved.rows).toHaveLength(1);
    expect(saved.rows[0]).toMatchObject({
      result: 'VALID',
      ...center,
      accuracy: 5,
    });
    expect(saved.rows[0].policy_snapshot).toBeTruthy();
    for (const check of [
      {
        data: {
          latitude: center.latitude + 0.01,
          longitude: center.longitude,
          accuracy: 5,
        },
        result: 'OUTSIDE_GEOFENCE',
      },
      { data: { ...center, accuracy: 50 }, result: 'ACCURACY_INSUFFICIENT' },
      { data: {}, result: 'LOCATION_REQUIRED' },
    ]) {
      const response = await page.request.post('/api/locations/validate', {
        headers: own.headers,
        data: check.data,
      });
      expect(response.status()).toBe(200);
      const body: GeoCheckView = await response.json();
      expect(body).toMatchObject({
        employeeId: employee.id,
        result: check.result,
      });
      const persisted = await own.database.pool.query(
        'select result from geo_checks where id=$1 and employee_id=$2',
        [body.id, employee.id],
      );
      expect(persisted.rows).toEqual([{ result: check.result }]);
    }
    expect(mutations).toEqual(['/api/locations/validate']);
    const checks = await own.database.pool.query(
      'select result from geo_checks where employee_id=$1',
      [employee.id],
    );
    expect(
      checks.rows.map((row: { result: string }) => row.result).sort(),
    ).toEqual([
      'ACCURACY_INSUFFICIENT',
      'LOCATION_REQUIRED',
      'OUTSIDE_GEOFENCE',
      'VALID',
    ]);
    await page.reload();
    await expect(
      page.getByRole('heading', {
        name: `Sede ${suffix} · Activo`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Ubicación válida', { exact: true }),
    ).toHaveCount(0);
  } finally {
    await own.cleanup();
  }
});
