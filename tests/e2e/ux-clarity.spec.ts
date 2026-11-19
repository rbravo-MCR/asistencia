import { test, expect } from './fixtures.js';

test('Inicio y navegación explican dónde asignar turnos y administrar o solicitar días', async ({
  page,
}, info) => {
  await page.goto('/');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: /Hola,/ })).toBeVisible();
  await main.getByRole('link', { name: 'Asignar turnos', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Asignar turnos', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Cómo asignar un turno', exact: true }),
  ).toContainText('Publicar');
  await page
    .getByRole('button', { name: 'Asignar turno', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Asignar turno', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Resumen de la asignación', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  await page.goto('/');
  await main
    .getByRole('link', { name: 'Administrar días', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Equipo', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('heading', { name: 'Días del equipo', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Asignar días', exact: true }).click();
  await expect(
    page.getByRole('dialog', {
      name: 'Asignar días por aniversario',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
  await page.goto('/');
  await main
    .getByRole('link', { name: 'Solicitar vacaciones', exact: true })
    .click();
  // The fixture account deliberately has no employee: explain the next action, never grant capabilities.
  await expect(
    page.getByRole('heading', {
      name: 'Primero vincula tu cuenta a un empleado',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Revisar empleados', exact: true }),
  ).toHaveAttribute('href', '/empleados');
  await expect(
    page.getByRole('button', { name: 'Nueva solicitud', exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/solicitudes$/);
  await page
    .getByRole('button', { name: 'Buscar secciones', exact: true })
    .click();
  await page
    .getByRole('searchbox', { name: 'Buscar una sección', exact: true })
    .fill('saldo');
  await expect(
    page
      .getByRole('dialog')
      .getByRole('link', { name: 'Mis vacaciones', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Buscar secciones', exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: info.outputPath('requisito-empleado-y-accion.png'),
    fullPage: true,
  });
});

test('conserva persona y fecha al abrir autorizaciones en otra pestaña', async ({
  page,
  account,
}) => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
    throw new Error('Solo PostgreSQL _test.');
  const { createDatabase } =
    await import('../../apps/api/src/infrastructure/database/client.js');
  const { randomUUID } = await import('node:crypto');
  const database = createDatabase(databaseUrl);
  let departmentId: string | undefined,
    employeeId: string | undefined,
    templateId: string | undefined;
  try {
    const session = await (await page.request.get('/api/auth/session')).json();
    const headers = {
      origin: 'http://127.0.0.1:5183',
      'x-csrf-token': session.csrfToken,
    };
    const post = async (path: string, data: object) => {
      const response = await page.request.post(`/api${path}`, {
        headers,
        data,
      });
      expect(response.status()).toBe(201);
      return response.json();
    };
    departmentId = (
      await post('/departments', {
        name: `UI autorizaciones ${randomUUID().slice(0, 8)}`,
      })
    ).id;
    employeeId = (
      await post('/employees', {
        fullName: 'Persona ficticia para prueba de autorización',
        departmentId,
        position: 'Prueba UI',
        joinedOn: '2024-01-01',
        category: 'ADMINISTRATIVE',
        status: 'ACTIVE',
        supervisorId: null,
        userId: account.id,
      })
    ).id;
    templateId = (
      await post('/shift-templates', {
        name: `Presencial UI ${randomUUID().slice(0, 8)}`,
        category: 'ADMINISTRATIVE',
        startTime: '08:00',
        endTime: '17:00',
        timeZone: 'America/Merida',
        weekdays: [1, 2, 3, 4, 5],
        modality: 'ONSITE',
        active: true,
      })
    ).id;
    await page.goto('/calendario');
    await page
      .getByRole('button', { name: 'Asignar turno', exact: true })
      .click();
    await page
      .getByLabel('Empleado del turno', { exact: true })
      .selectOption(employeeId!);
    await page
      .getByLabel('Plantilla', { exact: true })
      .selectOption(templateId!);
    await page
      .getByLabel('Fecha de inicio', { exact: true })
      .fill('2026-11-23');
    await expect(
      page.getByText(/Esta persona no tiene autorizaciones de centro/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Guardar borrador', exact: true }),
    ).toBeDisabled();
    const setup = page.getByRole('link', {
      name: 'Revisar autorizaciones en Ubicaciones',
      exact: true,
    });
    await expect(setup).toHaveAttribute('target', '_blank');
    let prompts = 0;
    page.on('dialog', async (dialog) => {
      prompts++;
      await dialog.dismiss();
    });
    const opened = page.waitForEvent('popup');
    await setup.click();
    const popup = await opened;
    await expect(
      popup.getByRole('heading', { name: 'Centros de trabajo', exact: true }),
    ).toBeVisible();
    await popup.close();
    await expect(
      page.getByRole('dialog', { name: 'Asignar turno', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Empleado del turno', { exact: true }),
    ).toHaveValue(employeeId!);
    await expect(
      page.getByLabel('Fecha de inicio', { exact: true }),
    ).toHaveValue('2026-11-23');
    expect(prompts).toBe(0);
  } finally {
    if (templateId)
      await database.pool.query('delete from shift_templates where id=$1', [
        templateId,
      ]);
    if (employeeId)
      await database.pool.query('delete from employees where id=$1', [
        employeeId,
      ]);
    if (departmentId)
      await database.pool.query('delete from departments where id=$1', [
        departmentId,
      ]);
    await database.pool.end();
  }
});
