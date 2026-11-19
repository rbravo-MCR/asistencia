import { randomUUID } from 'node:crypto';
import {
  test,
  expect,
  deleteTestUsers,
  openMainNavigation,
} from './fixtures.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { createIdentityService } from '../../apps/api/src/modules/identity/index.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('E2E requiere TEST_DATABASE_URL terminada en _test.');

test('ingresa con cuenta real, cierra sesión y bloquea acceso privado al recargar', async ({
  page,
  context,
  account,
}, testInfo) => {
  await context.clearCookies();
  await page.goto('/ingresar');
  await page
    .getByLabel('Número de usuario o correo', { exact: true })
    .fill(account.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
  await openMainNavigation(page);
  await page.getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mi cuenta', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(account.email, { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Mi cuenta', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('cuenta.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await page.goto('/empleados');
  await expect(
    page.getByRole('heading', { name: 'Ingresar', exact: true }),
  ).toBeVisible();
  expect((await page.request.get('/api/auth/session')).status()).toBe(401);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Ingresar', exact: true }),
  ).toBeVisible();
});

// This test uses the same authenticated browser and real PostgreSQL as the UI.
test('crea empleado y jefatura desde la interfaz y conserva ambos al recargar', async ({
  page,
}, testInfo) => {
  const database = createDatabase(databaseUrl as string);
  const employeeIds: string[] = [];
  let departmentId: string | undefined;
  const name = `Persona E2E ${randomUUID()}`;
  const departmentName = `Área personas ${randomUUID()}`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const sessionResponse = await page.request.get('/api/auth/session');
    const session = await sessionResponse.json();
    const departmentResponse = await page.request.post('/api/departments', {
      headers: {
        origin: 'http://127.0.0.1:5183',
        'x-csrf-token': session.csrfToken,
      },
      data: { name: departmentName },
    });
    expect(departmentResponse.status()).toBe(201);
    departmentId = (await departmentResponse.json()).id;
    await page.goto('/empleados');
    await page
      .getByRole('button', { name: 'Nuevo empleado', exact: true })
      .click();
    await expect(
      page.getByLabel('Número interno', { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        'El número interno se generará automáticamente al guardar.',
      ),
    ).toBeVisible();
    await page.getByLabel('Nombre completo', { exact: true }).fill(name);
    await page
      .getByLabel('Departamento', { exact: true })
      .selectOption(departmentId!);
    await page.getByLabel('Puesto', { exact: true }).fill('Analista E2E');
    await page
      .getByLabel('Celular', { exact: true })
      .fill('+52 (999) 123-4567');
    await page
      .getByLabel('Dirección', { exact: true })
      .fill('Calle 10 #20, Mérida');
    await page
      .getByLabel('Fecha de ingreso', { exact: true })
      .fill('2024-02-29');
    const creation = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/employees') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Crear empleado', exact: true })
      .click();
    const created = await creation;
    const employee = await created.json();
    if (employee.id) employeeIds.push(employee.id);
    expect(created.status()).toBe(201);
    expect(created.request().postDataJSON()).not.toHaveProperty(
      'employeeNumber',
    );
    expect(employee.employeeNumber).toMatch(/^\d{6,30}$/);
    expect(employee.employeeNumber).not.toBe('999999');
    await page.getByRole('searchbox', { name: 'Buscar empleados' }).fill(name);
    await page.getByRole('button', { name: `Acciones de ${name}` }).click();
    await page
      .getByRole('menuitem', { name: 'Ver expediente', exact: true })
      .click();
    await expect(
      page
        .getByRole('dialog')
        .getByText(employee.employeeNumber, { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar panel' }).click();
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole('searchbox', { name: 'Buscar empleados' }).fill(name);
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    const stored = await database.pool.query(
      'select full_name, department_id, employee_number, phone_number, address from employees where id = $1',
      [employee.id],
    );
    expect(stored.rows).toEqual([
      {
        full_name: name,
        department_id: departmentId,
        employee_number: employee.employeeNumber,
        phone_number: '+529991234567',
        address: 'Calle 10 #20, Mérida',
      },
    ]);
    await page.goto('/responsables');
    await page
      .getByRole('button', { name: 'Nueva responsabilidad', exact: true })
      .click();
    await page
      .getByLabel('Tipo de responsabilidad', { exact: true })
      .selectOption('HEAD');
    await page
      .getByLabel('Empleado', { exact: true })
      .selectOption(employee.id);
    await page
      .getByLabel('Departamento', { exact: true })
      .selectOption(departmentId!);
    await page.getByLabel('Motivo', { exact: true }).fill('Nombramiento E2E');
    const assignment = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/assignments') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Asignar responsable', exact: true })
      .click();
    expect((await assignment).status()).toBe(201);
    await page.reload();
    await expect(
      page.getByRole('heading').filter({ hasText: name }),
    ).toBeVisible();
    const storedAssignment = await database.pool.query(
      'select kind, department_id from organization_assignments where employee_id = $1 and ends_at is null and revoked_at is null',
      [employee.id],
    );
    expect(storedAssignment.rows).toEqual([
      { kind: 'HEAD', department_id: departmentId },
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('responsables.png'),
      fullPage: true,
    });
  } finally {
    try {
      if (employeeIds.length) {
        await database.pool.query(
          'delete from organization_assignments where employee_id = any($1::uuid[])',
          [employeeIds],
        );
        await database.pool.query(
          'delete from employees where id = any($1::uuid[])',
          [employeeIds],
        );
      }
      if (departmentId)
        await database.pool.query('delete from departments where id = $1', [
          departmentId,
        ]);
    } finally {
      await database.pool.end();
    }
  }
});

test('empleado no ve administración ni puede concederse roles mediante la API', async ({
  page,
  context,
}) => {
  const database = createDatabase(databaseUrl as string);
  let userId: string | undefined;
  const input = {
    email: `${randomUUID()}@example.test`,
    name: 'Empleado E2E',
    password: `Clave temporal ${randomUUID()}`,
    active: true,
    roles: ['EMPLOYEE'] as const,
  };
  try {
    const user = await createIdentityService(database.db, {
      sessionHours: 8,
    }).createUser({ ...input, roles: [...input.roles] });
    userId = user.id;
    await context.clearCookies();
    await page.goto('/ingresar');
    await page
      .getByLabel('Número de usuario o correo', { exact: true })
      .fill(input.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(input.password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Hola, Empleado E2E', exact: true }),
    ).toBeVisible();
    await openMainNavigation(page);
    await expect(
      page
        .getByRole('navigation', { name: 'Principal' })
        .getByRole('link', { name: 'Usuarios', exact: true }),
    ).toHaveCount(0);
    expect((await page.request.get('/api/users')).status()).toBe(403);
    const session = await (await page.request.get('/api/auth/session')).json();
    const escalation = await page.request.put(`/api/users/${user.id}`, {
      headers: {
        origin: 'http://127.0.0.1:5183',
        'x-csrf-token': session.csrfToken,
      },
      data: {
        email: input.email,
        name: input.name,
        roles: ['ADMIN'],
        active: true,
      },
    });
    expect(escalation.status()).toBe(403);
    const stored = await database.pool.query(
      'select role from user_roles where user_id = $1',
      [user.id],
    );
    expect(stored.rows).toEqual([{ role: 'EMPLOYEE' }]);
  } finally {
    try {
      if (userId) await deleteTestUsers(database, [userId]);
    } finally {
      await database.pool.end();
    }
  }
});

test('edita y elimina empleados desde la web sin cambiar el número interno', async ({
  page,
}) => {
  const database = createDatabase(databaseUrl as string);
  let departmentId: string | undefined;
  let employeeId: string | undefined;
  const name = `CRUD empleado ${randomUUID()}`;
  try {
    const session = await (await page.request.get('/api/auth/session')).json();
    const headers = {
      origin: 'http://127.0.0.1:5183',
      'x-csrf-token': session.csrfToken,
    };
    const department = await page.request.post('/api/departments', {
      headers,
      data: { name: `Área CRUD ${randomUUID()}` },
    });
    expect(department.status()).toBe(201);
    departmentId = (await department.json()).id;
    const created = await page.request.post('/api/employees', {
      headers,
      data: {
        fullName: name,
        departmentId,
        position: 'Analista',
        joinedOn: '2026-11-01',
        category: 'ADMINISTRATIVE',
        status: 'ACTIVE',
        supervisorId: null,
        userId: null,
      },
    });
    expect(created.status()).toBe(201);
    const original = await created.json();
    employeeId = original.id;
    await page.goto('/empleados');
    await page.getByRole('searchbox', { name: 'Buscar empleados' }).fill(name);
    const editButton = page.getByRole('button', {
      name: `Acciones de ${name}`,
      exact: true,
    });
    await expect(editButton).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await editButton.click();
    await page
      .getByRole('menuitem', { name: 'Editar empleado', exact: true })
      .click();
    await expect(
      page.getByLabel('Número interno', { exact: true }),
    ).toHaveValue(original.employeeNumber);
    await page.getByLabel('Puesto', { exact: true }).fill('Coordinación');
    await page.getByLabel('Celular', { exact: true }).fill('999 765 4321');
    await page
      .getByLabel('Dirección', { exact: true })
      .fill('Nueva dirección, Mérida');
    const updating = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/employees/${employeeId}`) &&
        r.request().method() === 'PUT',
    );
    await page
      .getByRole('button', { name: 'Guardar empleado', exact: true })
      .click();
    const updated = await updating;
    expect(updated.status()).toBe(200);
    expect((await updated.json()).employeeNumber).toBe(original.employeeNumber);
    await page.reload();
    await page.getByRole('searchbox', { name: 'Buscar empleados' }).fill(name);
    await page.getByRole('button', { name: `Acciones de ${name}` }).click();
    await page
      .getByRole('menuitem', { name: 'Ver expediente', exact: true })
      .click();
    const detail = page.getByRole('dialog');
    await expect(
      detail.getByText('Coordinación', { exact: true }),
    ).toBeVisible();
    await expect(detail.getByText('9997654321', { exact: true })).toBeVisible();
    await expect(
      detail.getByText('Nueva dirección, Mérida', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar panel' }).click();
    await page
      .getByRole('button', { name: `Acciones de ${name}`, exact: true })
      .click();
    await page
      .getByRole('menuitem', { name: 'Eliminar empleado', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Cancelar eliminación', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: `Acciones de ${name}`, exact: true })
      .click();
    await page
      .getByRole('menuitem', { name: 'Eliminar empleado', exact: true })
      .click();
    const removing = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/employees/${employeeId}`) &&
        r.request().method() === 'DELETE',
    );
    await page
      .getByRole('button', { name: 'Confirmar eliminación', exact: true })
      .click();
    expect((await removing).status()).toBe(204);
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(
      0,
    );
    expect(
      (
        await database.pool.query('select id from employees where id=$1', [
          employeeId,
        ])
      ).rows,
    ).toEqual([]);
  } finally {
    try {
      if (employeeId)
        await database.pool.query('delete from employees where id=$1', [
          employeeId,
        ]);
      if (departmentId)
        await database.pool.query('delete from departments where id=$1', [
          departmentId,
        ]);
    } finally {
      await database.pool.end();
    }
  }
});
