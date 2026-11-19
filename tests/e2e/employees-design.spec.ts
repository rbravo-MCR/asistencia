import { test, expect } from './fixtures.js';
import { randomUUID } from 'node:crypto';
test('Empleados abre panel lateral y filtra directorio con identidad de referencia', async ({
  page,
}, info) => {
  await page.setViewportSize({
    width: info.project.name === 'desktop' ? 1672 : 390,
    height: 941,
  });
  await page.goto('/empleados');
  await expect(
    page.getByRole('heading', { name: 'Empleados', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('before-employees.png'),
    fullPage: true,
  });
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('searchbox', { name: 'Buscar empleados' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Nuevo empleado', exact: true })
    .click();
  const editor = page.getByRole('dialog', {
    name: 'Nuevo empleado',
    exact: true,
  });
  await expect(editor).toBeVisible();
  await expect(
    editor.getByLabel('Nombre completo', { exact: true }),
  ).toBeFocused();
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  for (const mode of ['dark', 'light']) {
    await page
      .getByRole('combobox', { name: 'Tema de apariencia' })
      .selectOption(mode);
    await page
      .getByRole('button', { name: 'Nuevo empleado', exact: true })
      .click();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`employees-${mode}-${info.project.name}.png`),
      fullPage: true,
    });
    await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  await page
    .getByRole('button', { name: 'Nuevo empleado', exact: true })
    .click();
  await editor
    .getByLabel('Nombre completo', { exact: true })
    .fill('Borrador QA');
  page.once('dialog', (d) => d.dismiss());
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(editor).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(editor).toHaveCount(0);
  const search = page.getByRole('searchbox', { name: 'Buscar empleados' });
  await search.fill('sin coincidencias QA');
  await expect(page.getByText('No encontramos empleados.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(search).toHaveValue('');
});

test('directorio filtra registros reales, pagina y conserva reflow en ambos temas', async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const marker = `Diseño QA ${randomUUID().slice(0, 8)}`;
  const session = await (await page.request.get('/api/auth/session')).json();
  const headers = {
    origin: 'http://127.0.0.1:5183',
    'x-csrf-token': session.csrfToken,
  };
  const department = await page.request.post('/api/departments', {
    headers,
    data: { name: marker },
  });
  expect(department.status()).toBe(201);
  const departmentId = (await department.json()).id;
  const ids: string[] = [];
  try {
    for (let i = 0; i < 12; i++) {
      const response = await page.request.post('/api/employees', {
        headers,
        data: {
          fullName: `${marker} · Persona ${String(i + 1).padStart(2, '0')}`,
          departmentId,
          position:
            i === 0
              ? 'Coordinación de atención y operaciones'
              : 'Analista de operaciones',
          joinedOn: '2024-02-29',
          category: i % 2 ? 'ADMINISTRATIVE' : 'OPERATIONAL',
          status: i === 11 ? 'INACTIVE' : 'ACTIVE',
          supervisorId: null,
          userId: null,
        },
      });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id);
    }
    await page.goto('/empleados');
    await page
      .getByRole('searchbox', { name: 'Buscar empleados' })
      .fill(marker);
    await expect(
      page.getByRole('heading', { name: '12 empleados', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(
      page.getByRole('heading', { name: `${marker} · Persona 12` }),
    ).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Filtrar por estado' })
      .selectOption('INACTIVE');
    await expect(
      page.getByRole('heading', { name: '1 empleado', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await page
      .getByRole('combobox', { name: 'Filtrar por departamento' })
      .selectOption(departmentId);
    await page
      .getByRole('combobox', { name: 'Filtrar por categoría' })
      .selectOption('OPERATIONAL');
    await expect(
      page.getByRole('heading', { name: '6 empleados', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Filtrar por categoría' })
      .selectOption('');
    const widths =
      info.project.name === 'desktop'
        ? [320, 360, 390, 768, 1024, 1280, 1440]
        : [390];
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
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(`directory-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    }
  } finally {
    for (const id of ids)
      expect(
        (
          await page.request.delete(`/api/employees/${id}`, { headers })
        ).status(),
      ).toBe(204);
    expect(
      (
        await page.request.delete(`/api/departments/${departmentId}`, {
          headers,
        })
      ).status(),
    ).toBe(204);
  }
});
