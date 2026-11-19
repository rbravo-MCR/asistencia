import { randomUUID } from 'node:crypto';
import { test, expect, deleteTestUsers } from './fixtures.js';
import { createIdentityService } from '../../apps/api/src/modules/identity/index.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';

test('Departamentos establece referencia visual con drawer, acciones y estados en ambos temas', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
    throw Error('Solo _test');
  const db = createDatabase(databaseUrl);
  const ids: string[] = [];
  const prefix = `QA ${randomUUID().slice(0, 6)}`;
  const names = ['Administración', 'Atención a clientes', 'Operaciones'].map(
    (name) => `${prefix} · ${name}`,
  );
  const desktop = testInfo.project.name === 'desktop';
  try {
    const session = await (await page.request.get('/api/auth/session')).json();
    for (const name of names) {
      const response = await page.request.post('/api/departments', {
        headers: {
          origin: 'http://127.0.0.1:5183',
          'x-csrf-token': session.csrfToken,
        },
        data: { name },
      });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id);
    }
    await page.setViewportSize({ width: desktop ? 1440 : 390, height: 900 });
    await page.goto('/departamentos');
    await expect(page.getByText(names[0]!, { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('before-departments.png'),
      fullPage: true,
    });
    await expect(
      page.getByRole('textbox', {
        name: 'Nombre del departamento',
        exact: true,
      }),
    ).toHaveCount(0);
    const search = page.getByRole('searchbox', {
      name: 'Buscar departamentos',
    });
    for (const mode of ['light', 'dark']) {
      await page
        .getByRole('combobox', { name: 'Tema de apariencia' })
        .selectOption(mode);
      for (const width of desktop ? [768, 1024, 1280, 1440] : [320, 360, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await search.fill(prefix);
        await expect(page.getByText(names[0]!, { exact: true })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await page
          .getByRole('heading', { name: 'Departamentos', exact: true })
          .click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`departments-${mode}-${width}.png`),
          fullPage: true,
        });
      }
      const trigger = page.getByRole('button', {
        name: `Acciones de ${names[0]}`,
      });
      await trigger.click();
      const menu = page.getByRole('menu', { name: `Acciones de ${names[0]}` });
      await expect(
        menu.getByRole('menuitem', {
          name: 'Editar departamento',
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(
          `menu-${mode}-${desktop ? 'desktop' : 'mobile'}.png`,
        ),
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await trigger.press('Enter');
      await page
        .getByRole('menuitem', { name: 'Editar departamento', exact: true })
        .click();
      const drawer = page.getByRole('dialog', {
        name: 'Editar departamento',
        exact: true,
      });
      const input = drawer.getByRole('textbox', {
        name: 'Nombre del departamento',
        exact: true,
      });
      await expect(input).toBeFocused();
      await expect(input).toHaveValue(names[0]!);
      await page.screenshot({
        path: testInfo.outputPath(
          `drawer-${mode}-${desktop ? 'desktop' : 'mobile'}.png`,
        ),
        fullPage: true,
      });
      await page.keyboard.press('Shift+Tab');
      await expect(
        drawer.getByRole('button', { name: 'Cerrar panel' }),
      ).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(
        drawer.getByRole('button', { name: 'Guardar cambios', exact: true }),
      ).toBeFocused();
      await input.fill(names[0] + ' temporal');
      page.once('dialog', (d) => d.dismiss());
      await page.keyboard.press('Escape');
      await expect(input).toHaveValue(names[0] + ' temporal');
      page.once('dialog', (d) => d.accept());
      await drawer.getByRole('button', { name: 'Cancelar edición' }).click();
      await expect(drawer).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page
        .getByRole('menuitem', { name: 'Eliminar departamento', exact: true })
        .click();
      const confirmation = page.getByRole('alertdialog');
      await expect(
        confirmation.getByRole('button', { name: 'Cancelar eliminación' }),
      ).toBeFocused();
      await page.screenshot({
        path: testInfo.outputPath(
          `delete-${mode}-${desktop ? 'desktop' : 'mobile'}.png`,
        ),
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await expect(confirmation).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await search.fill(prefix + ' sin coincidencias');
      await expect(
        page.getByText('No encontramos departamentos.'),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(
          `empty-${mode}-${desktop ? 'desktop' : 'mobile'}.png`,
        ),
        fullPage: true,
      });
      await search.fill(prefix);
      await page.route('**/api/departments', (route) => route.abort('failed'));
      await page.getByRole('button', { name: 'Actualizar listado' }).click();
      await expect(page.getByRole('alert')).toContainText(
        'No se pudo cargar el listado',
      );
      await page.screenshot({
        path: testInfo.outputPath(
          `error-${mode}-${desktop ? 'desktop' : 'mobile'}.png`,
        ),
        fullPage: true,
      });
      await page.unroute('**/api/departments');
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/departments', async (route) => {
        await gate;
        await route.continue();
      });
      const loaded = page.waitForResponse('**/api/departments');
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(
          page
            .getByRole('status')
            .filter({ hasText: 'Cargando departamentos' }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(
            `loading-${mode}-${desktop ? 'desktop' : 'mobile'}.png`,
          ),
          fullPage: true,
        });
      } finally {
        release();
      }
      await (await loaded).finished();
      await page.unroute('**/api/departments');
      await expect(search).toBeVisible();
      await expect(page.getByText(names[0]!, { exact: true })).toBeVisible();
    }
    const longName =
      prefix + ' · ' + 'X'.repeat(100 - Array.from(prefix + ' · ').length);
    const longResult = await page.request.post('/api/departments', {
      headers: {
        origin: 'http://127.0.0.1:5183',
        'x-csrf-token': session.csrfToken,
      },
      data: { name: longName },
    });
    expect(longResult.status()).toBe(201);
    ids.push((await longResult.json()).id);
    await page.setViewportSize({ width: 390, height: 320 });
    await page.goto('/departamentos');
    await search.fill(longName);
    await expect(page.getByText(longName, { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: `Acciones de ${longName}` }).click();
    await page
      .getByRole('menuitem', { name: 'Eliminar departamento', exact: true })
      .click();
    const shortDialog = page.getByRole('alertdialog');
    const bounds = await shortDialog.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(15);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(305);
    await shortDialog
      .getByRole('button', { name: 'Confirmar eliminación' })
      .scrollIntoViewIfNeeded();
    await expect(
      shortDialog.getByRole('button', { name: 'Confirmar eliminación' }),
    ).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath(
        `long-name-landscape-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
  } finally {
    if (ids.length)
      await db.pool.query('delete from departments where id=any($1::uuid[])', [
        ids,
      ]);
    await db.pool.end();
  }
});

test('consulta sin permisos conserva vacío real y no ofrece acciones de escritura', async ({
  page,
}, testInfo) => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('_test'))
    throw Error('Solo _test');
  const db = createDatabase(url);
  let id: string | undefined;
  try {
    const password = randomUUID();
    const email = `readonly-${randomUUID()}@example.test`;
    const user = await createIdentityService(db.db).createUser({
      email,
      name: 'Consulta QA',
      password,
      roles: ['EMPLOYEE'],
      active: true,
    });
    id = user.id;
    const login = await page.request.post('/api/auth/login', {
      headers: { origin: 'http://127.0.0.1:5183' },
      data: { email, password },
    });
    expect(login.status()).toBe(200);
    await page.setViewportSize({
      width: testInfo.project.name === 'desktop' ? 1440 : 390,
      height: 900,
    });
    await page.goto('/departamentos');
    const session = await (await page.request.get('/api/auth/session')).json();
    expect(session.permissions.manageOrganization).toBe(false);
    expect(
      (await (await page.request.get('/api/departments')).json()).items,
    ).toEqual([]);
    await expect(page.getByText('Aún no hay departamentos.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Nuevo departamento' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Acciones de / }),
    ).toHaveCount(0);
    expect(
      (
        await page.request.post('/api/departments', {
          headers: {
            origin: 'http://127.0.0.1:5183',
            'x-csrf-token': session.csrfToken,
          },
          data: { name: 'QA no autorizado' },
        })
      ).status(),
    ).toBe(403);
    for (const mode of ['light', 'dark']) {
      await page
        .getByRole('combobox', { name: 'Tema de apariencia' })
        .selectOption(mode);
      await page.screenshot({
        path: testInfo.outputPath(
          `empty-readonly-${mode}-${testInfo.project.name}.png`,
        ),
        fullPage: true,
      });
    }
  } finally {
    if (id) await deleteTestUsers(db, [id]);
    await db.pool.end();
  }
});
