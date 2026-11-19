import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { test, expect } from './fixtures.js';

const paths = [
  '/',
  '/asistencia',
  '/incidencias',
  '/calendario',
  '/turnos',
  '/empleados',
  '/departamentos',
  '/responsables',
  '/solicitudes',
  '/aprobaciones',
  '/vacaciones',
  '/avisos',
  '/ubicaciones',
  '/configuracion',
  '/configuracion/asistencia',
  '/politicas-ausencias',
  '/usuarios',
  '/auditoria',
  '/cuenta',
  '/estado',
];

test('las veinte rutas privadas mantienen jerarquía y reflow en ambos temas', async ({
  page,
  account,
}, info) => {
  test.setTimeout(240_000);
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
    throw new Error('Solo PostgreSQL _test.');
  const db = createDatabase(databaseUrl);
  let departmentId: string | undefined;
  let employeeId: string | undefined;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const session = await (await page.request.get('/api/auth/session')).json();
    const headers = {
      origin: 'http://127.0.0.1:5183',
      'x-csrf-token': session.csrfToken,
    };
    const response = await page.request.post('/api/departments', {
      headers,
      data: { name: `Revisión visual ${randomUUID().slice(0, 8)}` },
    });
    expect(response.status()).toBe(201);
    departmentId = (await response.json()).id;
    const employee = await page.request.post('/api/employees', {
      headers,
      data: {
        fullName: 'Persona de revisión visual',
        departmentId,
        position: 'Operaciones',
        joinedOn: '2024-01-01',
        category: 'OPERATIONAL',
        status: 'ACTIVE',
        supervisorId: null,
        userId: account.id,
      },
    });
    expect(employee.status()).toBe(201);
    employeeId = (await employee.json()).id;
    const widths =
      info.project.name === 'desktop'
        ? [320, 360, 390, 768, 1024, 1280, 1440]
        : [390];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(
        page
          .locator('main [role="status"]')
          .filter({ hasText: /^(Cargando|Verificando)/ }),
      ).toHaveCount(0);
      await expect(page.locator('main')).toHaveCount(1);
      for (const theme of ['light', 'dark']) {
        await page
          .getByRole('combobox', { name: 'Tema de apariencia' })
          .selectOption(theme);
        for (const width of widths) {
          await page.setViewportSize({ width, height: 941 });
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${path} ${theme} ${width}`,
          ).toBe(true);
          await page.screenshot({
            path: info.outputPath(
              `${path === '/' ? 'inicio' : path.slice(1).replaceAll('/', '-')}-${theme}-${width}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }
    expect(errors).toEqual([]);
  } finally {
    if (employeeId)
      await db.pool.query('delete from employees where id=$1', [employeeId]);
    if (departmentId)
      await db.pool.query('delete from departments where id=$1', [
        departmentId,
      ]);
    await db.pool.end();
  }
});

test('la ampliación de texto conserva controles del encabezado dentro de su superficie', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 941 });
  await page.goto('/cuenta');
  await expect(
    page.getByRole('heading', { name: 'Mi cuenta', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const geometry = await page
    .getByRole('button', { name: 'Buscar secciones' })
    .evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const header = button.closest('header')!.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        headerTop: header.top,
        headerBottom: header.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
  expect(geometry.overflow).toBe(false);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.headerTop);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.headerBottom);
  await page.getByRole('button', { name: 'Buscar secciones' }).click();
  const search = page.getByRole('searchbox', { name: 'Buscar una sección' });
  await expect(search).toBeFocused();
  await search.fill('Mi cuenta');
  await expect(
    page
      .getByRole('dialog')
      .getByRole('link', { name: 'Mi cuenta', exact: true }),
  ).toBeVisible();
});
