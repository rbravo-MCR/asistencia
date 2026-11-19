import { randomUUID } from 'node:crypto';
import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import type {
  LeaveRequestView,
  VacationBalanceView,
} from '../../packages/contracts/src/index.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { test, expect } from './fixtures.js';

const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('E2E ausencias requiere base _test.');
const origin = 'http://127.0.0.1:5183';
const pdf = Buffer.from('%PDF-1.4\nEvidencia privada de prueba E2E\n%%EOF\n');

type Actor = {
  id: string;
  employeeId: string;
  context: BrowserContext;
  page: Page;
  headers: Record<string, string>;
};
async function setup(
  adminPage: Page,
  browser: Browser,
  adminId: string,
  info: TestInfo,
) {
  const database = createDatabase(source as string);
  const lock = await database.pool.connect();
  await lock.query("set statement_timeout = '120s'");
  await lock.query('select pg_advisory_lock(81415000)');
  const userIds: string[] = [],
    employeeIds: string[] = [],
    permissionIds: string[] = [],
    policyIds: string[] = [];
  const contexts: BrowserContext[] = [];
  let departmentId: string | undefined;
  const previousDirectors = (
    await database.pool.query(
      "select id,ends_at,revoked_at from organization_assignments where kind='DIRECTOR' and ends_at is null and revoked_at is null",
    )
  ).rows as { id: string; ends_at: Date | null; revoked_at: Date | null }[];
  const auth = await adminPage.request.get('/api/auth/session');
  expect(auth.status()).toBe(200);
  const adminSession = await auth.json();
  const adminHeaders = { origin, 'x-csrf-token': adminSession.csrfToken };
  async function post<T extends { id: string }>(
    path: string,
    data: object,
    track?: string[],
    method: 'POST' | 'PUT' = 'POST',
  ) {
    const response = await adminPage.request.fetch(`/api${path}`, {
      method,
      headers: adminHeaders,
      data,
    });
    const body = await response.json();
    if (response.ok() && body.id && track) track.push(body.id);
    expect(response.ok(), JSON.stringify(body)).toBe(true);
    return body as T;
  }
  const suffix = randomUUID().slice(0, 8);
  async function actor(name: string): Promise<Actor> {
    const password = `Temporal E2E ${randomUUID()}!`;
    const email = `${randomUUID()}@example.test`;
    const user = await post<{ id: string }>(
      '/users',
      {
        email,
        name: `${name} ${suffix}`,
        password,
        roles: ['EMPLOYEE'],
        active: true,
      },
      userIds,
    );
    const employee = await post<{ id: string }>(
      '/employees',
      {
        fullName: `${name} ${suffix}`,
        departmentId,
        position: 'E2E ausencias',
        joinedOn: '2024-01-01',
        category: 'OPERATIONAL',
        status: 'ACTIVE',
        supervisorId: null,
        userId: user.id,
      },
      employeeIds,
    );
    const context = await browser.newContext({
      baseURL: origin,
      viewport: adminPage.viewportSize(),
      isMobile: info.project.name === 'mobile',
      hasTouch: info.project.name === 'mobile',
      timezoneId: 'America/Merida',
    });
    contexts.push(context);
    const login = await context.request.post('/api/auth/login', {
      headers: { origin },
      data: { email, password },
    });
    expect(login.status()).toBe(200);
    const session = await login.json();
    return {
      id: user.id,
      employeeId: employee.id,
      context,
      page: await context.newPage(),
      headers: { origin, 'x-csrf-token': session.csrfToken },
    };
  }
  async function cleanup() {
    try {
      for (const context of contexts) await context.close();
      await lock.query('begin');
      await lock.query('select pg_advisory_xact_lock(81209002)');
      const allActors = [adminId, ...userIds];
      const events = (
        await lock.query(
          'select id from audit_events where actor_id=any($1::uuid[])',
          [allActors],
        )
      ).rows.map((r: { id: string }) => r.id);
      await lock.query(
        'select id from notification_outbox where recipient_id=any($1::uuid[]) or event_id=any($2::uuid[]) for update',
        [allActors, events],
      );
      await lock.query(
        'delete from notifications where user_id=any($1::uuid[]) or outbox_id in (select id from notification_outbox where event_id=any($2::uuid[]))',
        [allActors, events],
      );
      await lock.query(
        'delete from notification_outbox where recipient_id=any($1::uuid[]) or event_id=any($2::uuid[])',
        [allActors, events],
      );
      await lock.query(
        'delete from request_operations where actor_id=any($1::uuid[])',
        [allActors],
      );
      await lock.query(
        'delete from vacation_movements where employee_id=any($1::uuid[])',
        [employeeIds],
      );
      await lock.query(
        'delete from request_evidence where request_id in (select id from leave_requests where employee_id=any($1::uuid[]))',
        [employeeIds],
      );
      await lock.query(
        'delete from request_decisions where request_id in (select id from leave_requests where employee_id=any($1::uuid[]))',
        [employeeIds],
      );
      await lock.query(
        'delete from leave_requests where employee_id=any($1::uuid[])',
        [employeeIds],
      );
      await lock.query(
        'delete from organization_assignments where employee_id=any($1::uuid[])',
        [employeeIds],
      );
      for (const previous of previousDirectors)
        await lock.query(
          'update organization_assignments set ends_at=$2,revoked_at=$3 where id=$1',
          [previous.id, previous.ends_at, previous.revoked_at],
        );
      await lock.query('delete from employees where id=any($1::uuid[])', [
        employeeIds,
      ]);
      await lock.query(
        'delete from permission_types where id=any($1::uuid[])',
        [permissionIds],
      );
      await lock.query('delete from leave_policies where id=any($1::uuid[])', [
        policyIds,
      ]);
      if (departmentId)
        await lock.query('delete from departments where id=$1', [departmentId]);
      await lock.query('delete from users where id=any($1::uuid[])', [userIds]);
      await lock.query('delete from audit_events where id=any($1::uuid[])', [
        events,
      ]);
      await lock.query('commit');
    } catch (error) {
      await lock.query('rollback');
      throw error;
    } finally {
      await lock.query('select pg_advisory_unlock(81415000)');
      lock.release();
      await database.pool.end();
    }
  }
  try {
    const department = await post<{ id: string }>('/departments', {
      name: `Ausencias E2E ${suffix}`,
    });
    departmentId = department.id;
    const employee = await actor('Persona solicitante'),
      head = await actor('Jefatura'),
      director = await actor('Dirección'),
      outsider = await actor('Persona ajena');
    await post('/assignments', {
      kind: 'HEAD',
      employeeId: head.employeeId,
      departmentId,
      reason: 'Jefatura aislada para E2E',
    });
    await post('/assignments', {
      kind: 'DIRECTOR',
      employeeId: director.employeeId,
      departmentId: null,
      reason: 'Dirección aislada para E2E',
    });
    const clock = await employee.context.request.get('/api/attendance/me');
    expect(clock.status()).toBe(200);
    const serverTime = (await clock.json()).serverTime as string;
    const future = new Date(new Date(serverTime).getTime() + 30 * 86400000);
    const from = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Merida',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(future);
    const to = new Date(Date.parse(from) + 86400000).toISOString().slice(0, 10);
    return {
      database,
      employee,
      head,
      director,
      outsider,
      from,
      to,
      post,
      permissionIds,
      policyIds,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
function card(page: Page, reason: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByText(reason, { exact: true }) })
    .first();
}
async function requests(actor: Actor) {
  const response = await actor.context.request.get('/api/requests');
  expect(response.status()).toBe(200);
  return (await response.json()).items as LeaveRequestView[];
}
async function balance(actor: Actor) {
  const response = await actor.context.request.get('/api/vacation/balances');
  expect(response.status()).toBe(200);
  return ((await response.json()).items as VacationBalanceView[]).find(
    (item) =>
      item.employeeId === actor.employeeId && item.anniversaryYear === 1,
  )!;
}
async function decide(
  actor: Actor,
  reason: string,
  step: 'HEAD' | 'DIRECTOR',
  decision: 'APPROVE' | 'REJECT' = 'APPROVE',
) {
  await actor.page.goto('/aprobaciones');
  await expect(
    actor.page.getByRole('heading', { name: 'Aprobaciones', exact: true }),
  ).toBeVisible();
  const item = card(actor.page, reason);
  await item
    .getByLabel('Motivo de la decisión', { exact: true })
    .fill(`Decisión ${step} E2E`);
  const pending = actor.page.waitForResponse(
    (response) =>
      /\/api\/requests\/[^/]+\/decision$/.test(response.url()) &&
      response.request().method() === 'POST',
  );
  await item
    .getByRole('button', {
      name:
        decision === 'REJECT'
          ? 'Rechazar'
          : step === 'HEAD'
            ? 'Autorizar'
            : 'Dar visto bueno',
      exact: true,
    })
    .click();
  expect((await pending).ok()).toBe(true);
}
async function capture(page: Page, info: TestInfo, name: string) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
}
async function createThroughUi(
  actor: Actor,
  from: string,
  to: string,
  reason: string,
  kind: 'VACATION' | 'PERMISSION',
  permissionTypeId?: string,
) {
  await actor.page.goto('/solicitudes');
  await actor.page
    .getByRole('button', { name: 'Nueva solicitud', exact: true })
    .click();
  await actor.page
    .getByLabel('Tipo de solicitud', { exact: true })
    .selectOption(kind);
  await actor.page.getByLabel('Desde', { exact: true }).fill(from);
  await actor.page.getByLabel('Hasta', { exact: true }).fill(to);
  if (kind === 'VACATION')
    await actor.page
      .getByLabel('Período de vacaciones', { exact: true })
      .selectOption('1');
  else {
    await actor.page
      .getByLabel('Tipo de permiso', { exact: true })
      .selectOption(permissionTypeId!);
    await actor.page
      .getByLabel('Evidencias (obligatorias)', { exact: true })
      .setInputFiles({
        name: 'constancia-e2e.pdf',
        mimeType: 'application/pdf',
        buffer: pdf,
      });
  }
  await actor.page
    .getByLabel('Motivo de la solicitud', { exact: true })
    .fill(reason);
  let submissions = 0;
  const record = (request: import('@playwright/test').Request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/requests'))
      submissions++;
  };
  actor.page.on('request', record);
  await actor.page
    .getByRole('button', { name: 'Revisar solicitud', exact: true })
    .click();
  await expect(
    actor.page.getByRole('heading', {
      name: 'Revisa tu solicitud',
      exact: true,
    }),
  ).toBeFocused();
  await expect(
    actor.page.getByRole('region', {
      name: 'Revisa tu solicitud',
      exact: true,
    }),
  ).toContainText(reason);
  expect(submissions).toBe(0);
  const pending = actor.page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/requests') &&
      response.request().method() === 'POST',
  );
  await actor.page
    .getByRole('button', { name: 'Enviar solicitud', exact: true })
    .click();
  const response = await pending;
  expect(response.ok()).toBe(true);
  expect(submissions).toBe(1);
  actor.page.off('request', record);
  await expect
    .poll(
      async () =>
        (await requests(actor)).find((item) => item.reason === reason)?.id,
    )
    .toBeDefined();
  await expect(actor.page.getByRole('dialog')).toBeHidden();
  return (await requests(actor)).find((item) => item.reason === reason)!;
}

test('jefatura aprueba vacaciones y cancelación definitivamente sin duplicar consumo o devolución', async ({
  page,
  browser,
  account,
}, info) => {
  test.setTimeout(120000);
  const own = await setup(page, browser, account.id, info);
  try {
    await own.post(
      '/leave/policy',
      {
        name: `Política E2E ${randomUUID().slice(0, 8)}`,
        entitlements: [{ fromYear: 1, days: 12 }],
        administrativeWeekdays: [1, 2, 3, 4, 5, 6, 7],
        operationalWeekdays: [1, 2, 3, 4, 5, 6, 7],
        excludeHolidays: false,
        idempotencyKey: randomUUID(),
      },
      own.policyIds,
      'PUT',
    );
    await own.post('/vacation/grants', {
      employeeId: own.employee.employeeId,
      anniversaryYear: 1,
      reason: 'Concesión explícita aislada E2E',
      idempotencyKey: randomUUID(),
    });
    const reason = `Vacaciones familiares E2E ${randomUUID().slice(0, 8)}`;
    const request = await createThroughUi(
      own.employee,
      own.from,
      own.to,
      reason,
      'VACATION',
    );
    expect(request.status).toBe('PENDING_HEAD');
    expect(request.days).toBe(2);
    expect(await balance(own.employee)).toMatchObject({
      balance: 12,
      reserved: 2,
      available: 10,
      approvedDays: 0,
    });
    await own.employee.page.goto('/vacaciones');
    await expect(
      own.employee.page
        .getByText('Disponibles para solicitar', { exact: true })
        .locator('..'),
    ).toContainText('10 días');
    await expect(
      own.employee.page.getByText('En revisión', { exact: true }).locator('..'),
    ).toContainText('2 días');
    await capture(own.employee.page, info, 'vacaciones-dias-en-revision');
    expect(
      (await requests(own.director)).find((item) => item.id === request.id),
    ).toMatchObject({ canHeadDecide: false, canDirectorDecide: false });
    await decide(own.head, reason, 'HEAD');
    expect(
      (await requests(own.employee)).find((item) => item.id === request.id),
    ).toMatchObject({
      status: 'APPROVED',
      approvalFlow: 'HEAD_ONLY',
      canDirectorDecide: false,
      decisions: [expect.objectContaining({ step: 'HEAD' })],
    });
    expect(
      (await requests(own.director)).find((item) => item.id === request.id),
    ).toMatchObject({
      status: 'APPROVED',
      canDirectorDecide: false,
      decisions: [expect.objectContaining({ step: 'HEAD' })],
    });
    expect(await balance(own.employee)).toMatchObject({
      balance: 10,
      reserved: 0,
      available: 10,
      approvedDays: 2,
      enjoyedDays: 0,
    });
    await own.employee.page.goto('/vacaciones');
    await expect(
      own.employee.page
        .getByText('Disponibles para solicitar', { exact: true })
        .locator('..'),
    ).toContainText('10 días');
    await expect(
      own.employee.page
        .getByText('Ya aprobados', { exact: true })
        .locator('..'),
    ).toContainText('2 días');
    await expect(
      own.employee.page.getByText('En revisión', { exact: true }).locator('..'),
    ).toContainText('0 días');
    await capture(own.employee.page, info, 'vacaciones-saldo-aprobado');
    await own.employee.page.goto('/solicitudes');
    const cancellationReason = `Cancelación futura E2E ${randomUUID().slice(0, 8)}`;
    const approvedCard = card(own.employee.page, reason);
    await approvedCard
      .getByLabel('Motivo del retiro o cancelación', { exact: true })
      .fill(cancellationReason);
    const pending = own.employee.page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/requests') &&
        response.request().method() === 'POST',
    );
    await approvedCard
      .getByRole('button', { name: 'Solicitar cancelación', exact: true })
      .click();
    expect((await pending).ok()).toBe(true);
    await expect
      .poll(
        async () =>
          (await requests(own.employee)).find(
            (item) => item.reason === cancellationReason,
          )?.id,
      )
      .toBeDefined();
    const cancellation = (await requests(own.employee)).find(
      (item) => item.reason === cancellationReason,
    )!;
    expect(cancellation.status).toBe('PENDING_HEAD');
    expect(await balance(own.employee)).toMatchObject({
      balance: 10,
      available: 10,
    });
    await decide(own.head, cancellationReason, 'HEAD');
    expect(
      (await requests(own.employee)).find((item) => item.id === request.id)
        ?.status,
    ).toBe('CANCELLED');
    expect(await balance(own.employee)).toMatchObject({
      balance: 12,
      reserved: 0,
      available: 12,
      approvedDays: 0,
    });
    await own.employee.page.goto('/solicitudes');
    await expect(
      card(own.employee.page, reason).getByText(/Cancelada/),
    ).toBeVisible();
    await capture(
      own.employee.page,
      info,
      'solicitudes-cancelacion-jefatura-definitiva',
    );
    const rows = await own.database.pool.query(
      "select count(*)::int as count from vacation_movements where request_id=$1 and kind='REFUND'",
      [request.id],
    );
    expect(rows.rows).toEqual([{ count: 1 }]);
  } finally {
    await own.cleanup();
  }
});

test('permiso conserva evidencia privada, rechaza lectura ajena y guarda rechazo del jefe', async ({
  page,
  browser,
  account,
}, info) => {
  test.setTimeout(120000);
  const own = await setup(page, browser, account.id, info);
  try {
    const permission = await own.post<{ id: string }>(
      '/leave/permission-types',
      {
        name: `Permiso evidencia ${randomUUID().slice(0, 8)}`,
        paid: true,
        evidenceRequired: true,
        allowPartial: true,
        active: true,
        idempotencyKey: randomUUID(),
      },
      own.permissionIds,
    );
    const reason = `Consulta privada E2E ${randomUUID().slice(0, 8)}`;
    const request = await createThroughUi(
      own.employee,
      own.from,
      own.from,
      reason,
      'PERMISSION',
      permission.id,
    );
    expect(request.evidence).toHaveLength(1);
    const file = request.evidence[0]!;
    const path = `/api/requests/${request.id}/evidence/${file.id}`;
    const download = await own.employee.context.request.get(path);
    expect(download.status()).toBe(200);
    expect(await download.body()).toEqual(pdf);
    expect(download.headers()['content-type']).toContain('application/pdf');
    expect(download.headers()['content-disposition']).toContain('attachment');
    expect(download.headers()['x-content-type-options']).toBe('nosniff');
    const foreign = await own.outsider.context.request.get(path);
    expect(foreign.status()).toBe(404);
    const foreignList = await requests(own.outsider);
    expect(foreignList.some((item) => item.id === request.id)).toBe(false);
    await own.employee.page.reload();
    await expect(
      card(own.employee.page, reason).getByRole('link', {
        name: 'constancia-e2e.pdf',
        exact: true,
      }),
    ).toBeVisible();
    await capture(own.employee.page, info, 'permiso-evidencia-privada');
    await decide(own.head, reason, 'HEAD', 'REJECT');
    const rejected = (await requests(own.employee)).find(
      (item) => item.id === request.id,
    )!;
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.decisions).toEqual([
      expect.objectContaining({
        step: 'HEAD',
        decision: 'REJECT',
        actorId: own.head.id,
      }),
    ]);
    await own.employee.page.reload();
    await expect(
      card(own.employee.page, reason).getByText(/Rechazada/),
    ).toBeVisible();
    await capture(own.employee.page, info, 'permiso-rechazo-conservado');
  } finally {
    await own.cleanup();
  }
});

test('permiso por horas exige aviso y motivo, permite cambiar goce y conserva condiciones previas', async ({
  page,
  browser,
  account,
}, info) => {
  test.setTimeout(120000);
  const own = await setup(page, browser, account.id, info);
  try {
    const name = `Entrada tardía ${randomUUID().slice(0, 8)}`;
    const permission = await own.post<{ id: string }>(
      '/leave/permission-types',
      {
        name,
        paid: true,
        evidenceRequired: false,
        allowPartial: true,
        minimumNoticeHours: 24,
        partialOnly: true,
        active: true,
        idempotencyKey: randomUUID(),
      },
      own.permissionIds,
    );
    await own.employee.page.goto('/solicitudes');
    await own.employee.page
      .getByRole('button', { name: 'Nueva solicitud', exact: true })
      .click();
    await own.employee.page
      .getByLabel('Tipo de solicitud', { exact: true })
      .selectOption('PERMISSION');
    await own.employee.page
      .getByLabel('Tipo de permiso', { exact: true })
      .selectOption(permission.id);
    await expect(
      own.employee.page.getByText(
        'Solicita este permiso al menos 24 horas antes del inicio de la ausencia.',
      ),
    ).toBeVisible();
    await expect(
      own.employee.page.getByLabel('Solicitar solo parte de la jornada'),
    ).toBeChecked();
    await expect(
      own.employee.page.getByLabel('Solicitar solo parte de la jornada'),
    ).toBeDisabled();
    await own.employee.page.getByLabel('Desde', { exact: true }).fill(own.from);
    await own.employee.page.getByLabel('Hasta', { exact: true }).fill(own.from);
    // Explicit Mérida browser zone: 08:00 local is 14:00 UTC.
    await own.employee.page
      .getByLabel('Inicio parcial')
      .fill(`${own.from}T08:00`);
    await own.employee.page.getByLabel('Fin parcial').fill(`${own.from}T09:00`);
    const reason = `Trámite por horas ${randomUUID().slice(0, 8)}`;
    await own.employee.page.getByLabel('Motivo de la solicitud').fill(reason);
    await own.employee.page
      .getByRole('button', { name: 'Revisar solicitud', exact: true })
      .click();
    await expect(
      own.employee.page.getByRole('heading', {
        name: 'Revisa tu solicitud',
        exact: true,
      }),
    ).toBeVisible();
    const pending = own.employee.page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/requests') && r.request().method() === 'POST',
    );
    await own.employee.page
      .getByRole('button', { name: 'Enviar solicitud', exact: true })
      .click();
    expect((await pending).ok()).toBe(true);
    const saved = (await requests(own.employee)).find(
      (r) => r.reason === reason,
    )!;
    expect(saved.paid).toBe(true);
    expect(saved.evidence).toEqual([]);
    expect(saved.partialStartsAt).toBe(`${own.from}T14:00:00.000Z`);
    await expect(own.employee.page.getByRole('dialog')).toBeHidden();
    await capture(own.employee.page, info, 'permiso-horas-sin-comprobante');

    await page.goto('/politicas-ausencias');
    await page
      .getByRole('button', { name: `Editar ${name}`, exact: true })
      .click();
    await expect(page.getByLabel('Con goce de sueldo')).toBeChecked();
    await page.getByLabel('Con goce de sueldo').uncheck();
    const editing = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/leave/permission-types/${permission.id}`) &&
        r.request().method() === 'PUT',
    );
    await page
      .getByRole('button', { name: 'Guardar tipo de permiso', exact: true })
      .click();
    expect((await editing).ok()).toBe(true);
    const config = await page.request.get('/api/leave/configuration');
    expect(
      (await config.json()).permissionTypes.find(
        (p: { id: string }) => p.id === permission.id,
      ),
    ).toMatchObject({ paid: false, minimumNoticeHours: 24, partialOnly: true });
    expect(
      (await requests(own.employee)).find((r) => r.id === saved.id)!.paid,
    ).toBe(true);
    await decide(own.head, reason, 'HEAD');
    expect(
      (await requests(own.employee)).find((r) => r.id === saved.id)!.status,
    ).toBe('APPROVED');
  } finally {
    await own.cleanup();
  }
});
