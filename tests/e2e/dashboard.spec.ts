import {
  shiftTemplates,
  scheduleAssignments,
} from '../../apps/api/src/modules/planning/schema.js';
import { vacationMovements } from '../../apps/api/src/modules/requests/schema.js';
import { randomUUID } from 'node:crypto';
import {
  test,
  expect,
  deleteTestUsers,
  openMainNavigation,
} from './fixtures.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { createIdentityService } from '../../apps/api/src/modules/identity/index.js';
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Require _test');
const origin = 'http://127.0.0.1:5183';
test('dashboard y configuración permiten guardar política, recargar y conservar versiones', async ({
  page,
  account,
}, testInfo) => {
  try {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Asistencia en tu alcance' }),
    ).toBeVisible();
    const summary = await page.request.get('/api/dashboard');
    expect(summary.status()).toBe(200);
    expect(summary.headers()['cache-control']).toBe('no-store');
    await openMainNavigation(page);
    await page
      .getByRole('link', { name: 'Configuración', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Configuración administrativa' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Pendientes de configuración' }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('configuration.png'),
      fullPage: true,
    });
    await page
      .getByRole('link', { name: 'Política de asistencia', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Política de asistencia',
        exact: true,
      }),
    ).toBeVisible();
    const before = await (
      await page.request.get('/api/attendance/policy')
    ).json();
    // Save existing values: this verifies persistence without changing the operating thresholds of parallel tests.
    await page
      .getByLabel('Tolerancia de entrada (min)', { exact: true })
      .fill(String(before.lateToleranceMinutes));
    await page
      .getByLabel('Entrada anticipada (min)', { exact: true })
      .fill(String(before.earlyEntryMinutes));
    await page
      .getByLabel('Salida posterior (min)', { exact: true })
      .fill(String(before.lateExitMinutes));
    await page
      .getByRole('button', { name: 'Guardar política', exact: true })
      .click();
    await expect(
      page.getByText('Nueva versión de política guardada.'),
    ).toBeVisible();
    await page.reload();
    const after = await (
      await page.request.get('/api/attendance/policy')
    ).json();
    expect(after.version).toBeGreaterThan(before.version);
    expect(after.lateToleranceMinutes).toBe(before.lateToleranceMinutes);
    const db = createDatabase(source);
    try {
      const rows = await db.pool.query(
        'select version,late_tolerance_minutes from attendance_policies where id = $1',
        [before.id],
      );
      expect(rows.rows).toEqual([
        {
          version: before.version,
          late_tolerance_minutes: before.lateToleranceMinutes,
        },
      ]);
    } finally {
      await db.pool.end();
    }
    await page.screenshot({
      path: testInfo.outputPath('attendance-policy.png'),
      fullPage: true,
    });
    await openMainNavigation(page);
    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('dashboard-admin.png'),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    // Preserve policy versions/snapshots for parallel tests while releasing only
    // this temporary account's FK before the account fixture deletes the user.
    const cleanup = createDatabase(source);
    try {
      await cleanup.pool.query(
        'update attendance_policies set created_by = null where created_by = $1',
        [account.id],
      );
    } finally {
      await cleanup.pool.end();
    }
  }
});
test('empleado y HR ven su alcance y la bienvenida pública permanece disponible', async ({
  page,
  context,
}, testInfo) => {
  const db = createDatabase(source);
  const users: string[] = [];
  const departments: string[] = [];
  const staff: string[] = [];
  const templates: string[] = [];
  try {
    const identity = createIdentityService(db.db);
    for (const role of ['EMPLOYEE', 'HR'] as const) {
      const user = await identity.createUser({
        email: `${randomUUID()}@example.test`,
        name: `Panel ${role}`,
        password: 'Temporal Dashboard 2026!',
        roles: [role],
        active: true,
      });
      users.push(user.id);
      if (role === 'EMPLOYEE') {
        const [d] = (
          await db.pool.query(
            'insert into departments(name) values ($1) returning id',
            [`Dashboard ${randomUUID()}`],
          )
        ).rows;
        departments.push(d.id);
        const [e] = (
          await db.pool.query(
            "insert into employees(employee_number,full_name,department_id,position,joined_on,category,user_id) values($1,$2,$3,'Prueba','2024-01-01','OPERATIONAL',$4) returning id",
            [randomUUID().slice(0, 20), 'Empleado Dashboard', d.id, user.id],
          )
        ).rows;
        staff.push(e.id);
      }
      await context.clearCookies();
      const login = await page.request.post('/api/auth/login', {
        headers: { origin },
        data: { email: user.email, password: 'Temporal Dashboard 2026!' },
      });
      expect(login.status()).toBe(200);
      await page.goto('/');
      await expect(
        page.getByRole('heading', { name: `Hola, Panel ${role}` }),
      ).toBeVisible();
      if (role === 'EMPLOYEE') {
        await expect(page.getByText('Sin períodos concedidos')).toBeVisible();
        const snapshot = {
          name: 'Jornada dashboard E2E',
          category: 'OPERATIONAL' as const,
          modality: 'HOME_OFFICE' as const,
          startTime: '08:00',
          endTime: '16:00',
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          timeZone: 'America/Merida',
          active: true,
        };
        const [template] = await db.db
          .insert(shiftTemplates)
          .values(snapshot)
          .returning();
        templates.push(template!.id);
        const state = await (await page.request.get('/api/dashboard')).json();
        const now = new Date(state.generatedAt);
        await db.db.insert(scheduleAssignments).values({
          employeeId: staff[0]!,
          templateId: template!.id,
          workDate: state.date,
          kind: 'REGULAR',
          templateVersion: 1,
          // Keep the test shift after activation even on a freshly initialized DB.
          startsAt: now,
          endsAt: new Date(now.getTime() + 3600000),
          modality: 'HOME_OFFICE',
          timeZone: 'America/Merida',
          templateName: snapshot.name,
          snapshot: { ...snapshot, version: 1 },
          status: 'PUBLISHED',
          publishedAt: now,
        });
        await db.db.insert(vacationMovements).values({
          employeeId: staff[0]!,
          anniversaryYear: 1,
          kind: 'GRANT',
          balanceDelta: 12,
          reservedDelta: 0,
          reason: 'Motivo privado de prueba',
          dedupeKey: randomUUID(),
          createdAt: now,
          createdBy: user.id,
        });
        await page
          .getByRole('button', { name: 'Actualizar resumen', exact: true })
          .click();
        await expect(
          page.getByText('Período 1: 12 días disponibles · 0 reservados'),
        ).toBeVisible();
        await expect(
          page.getByText('Home office', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText('En curso / ventana de marcaje', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(
            'Entrada: sin registro aceptado · Salida: sin registro aceptado',
          ),
        ).toBeVisible();
        const safe = await (await page.request.get('/api/dashboard')).text();
        expect(safe).not.toContain('Motivo privado de prueba');
        await expect(
          page.getByRole('heading', { name: 'Asistencia en tu alcance' }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('link', { name: 'Configuración', exact: true }),
        ).toHaveCount(0);
        expect(
          (await page.request.get('/api/configuration/status')).status(),
        ).toBe(403);
        await page.screenshot({
          path: testInfo.outputPath('dashboard-employee.png'),
          fullPage: true,
        });
        await page.goto('/configuracion');
        await expect(page.getByRole('alert')).toHaveText(
          'No tienes permiso para acceder a esta sección.',
        );
      } else {
        await page.goto('/configuracion');
        await expect(
          page.getByRole('heading', { name: 'Configuración administrativa' }),
        ).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Usuarios y roles' }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('link', { name: 'Auditoría de operaciones' }),
        ).toHaveCount(0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await context.clearCookies();
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Tu equipo, en un solo lugar.' }),
    ).toBeVisible();
    await expect(page.getByText('Servicios disponibles')).toBeVisible();
  } finally {
    if (staff.length) {
      await db.pool.query(
        'delete from vacation_movements where employee_id=any($1::uuid[])',
        [staff],
      );
      await db.pool.query(
        'delete from schedule_assignments where employee_id=any($1::uuid[])',
        [staff],
      );
    }
    if (templates.length)
      await db.pool.query(
        'delete from shift_templates where id=any($1::uuid[])',
        [templates],
      );
    if (staff.length)
      await db.pool.query('delete from employees where id=any($1::uuid[])', [
        staff,
      ]);
    if (departments.length)
      await db.pool.query('delete from departments where id=any($1::uuid[])', [
        departments,
      ]);
    await deleteTestUsers(db, users);
    await db.pool.end();
  }
});
