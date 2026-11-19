import { randomUUID } from 'node:crypto';
import {
  test,
  expect,
  deleteTestUsers,
  openMainNavigation,
} from './fixtures.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';

test('sidebar ordenado, colapso y menú móvil con Escape y retorno de foco', async ({
  page,
}, testInfo) => {
  const desktop = testInfo.project.name === 'desktop';
  await page.setViewportSize({ width: desktop ? 1440 : 390, height: 900 });
  await page.goto('/usuarios');
  await expect(
    page.getByRole('heading', { name: 'Usuarios', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('before-shell-users.png'),
    fullPage: true,
  });
  if (desktop) {
    const sidebar = page.getByRole('complementary', {
      name: 'Navegación de MCR',
    });
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.width).toBeLessThan(300);
    await expect(sidebar.getByText('Operación', { exact: true })).toBeVisible();
    await expect(
      sidebar.getByRole('link', { name: 'Usuarios', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Contraer navegación' }).click();
    expect((await sidebar.boundingBox())!.width).toBeLessThan(100);
    await page.getByRole('button', { name: 'Expandir navegación' }).click();
  } else {
    const trigger = page.getByRole('button', { name: 'Abrir menú principal' });
    await trigger.click();
    const drawer = page.getByRole('dialog', { name: 'Menú principal' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await drawer
      .getByRole('link', { name: 'Departamentos', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Departamentos', exact: true }),
    ).toBeVisible();
    await expect(drawer).toHaveCount(0);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('directorio filtra datos reales y guarda usuarios desde panel sin perder errores', async ({
  page,
  account,
}, testInfo) => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
    throw Error('Solo _test');
  const db = createDatabase(databaseUrl);
  const email = `ux-${randomUUID()}@example.test`;
  try {
    await page.goto('/cuenta');
    const navigation = await openMainNavigation(page);
    await navigation
      .getByRole('link', { name: 'Usuarios', exact: true })
      .click();
    const search = page.getByRole('searchbox', { name: 'Buscar usuarios' });
    await search.fill(account.email);
    await expect(
      page.getByRole('row').filter({ hasText: account.email }),
    ).toHaveCount(1);
    await page
      .getByLabel('Estado de cuenta', { exact: true })
      .selectOption('inactive');
    await expect(
      page.getByText('No hay usuarios con estos filtros.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    const panel = page.getByRole('dialog', {
      name: 'Crear usuario',
      exact: true,
    });
    await expect(panel).toBeVisible();
    await panel
      .getByLabel('Nombre', { exact: true })
      .fill('Revisión de interfaz');
    await panel
      .getByLabel('Correo electrónico', { exact: true })
      .fill(account.email);
    await panel
      .getByLabel('Contraseña inicial (6 a 128 caracteres)', { exact: true })
      .fill('Solo QA ' + randomUUID());
    await panel
      .getByRole('button', { name: 'Crear usuario', exact: true })
      .click();
    await expect(panel.getByRole('alert')).toBeVisible();
    await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue(
      'Revisión de interfaz',
    );
    await panel.getByLabel('Correo electrónico', { exact: true }).fill(email);
    await panel
      .getByRole('button', { name: 'Crear usuario', exact: true })
      .click();
    await expect(panel).toHaveCount(0);
    await search.fill(email);
    const row = page.getByRole('row').filter({ hasText: email });
    await expect(row).toBeVisible();
    await row
      .getByRole('button', { name: 'Editar Revisión de interfaz' })
      .click();
    const edit = page.getByRole('dialog', {
      name: 'Editar usuario',
      exact: true,
    });
    await edit.getByLabel('Nombre', { exact: true }).fill('Revisión editada');
    page.once('dialog', (d) => d.dismiss());
    await page.keyboard.press('Escape');
    await expect(edit).toBeVisible();
    await expect(edit.getByLabel('Nombre', { exact: true })).toHaveValue(
      'Revisión editada',
    );
    const backDecision = page.waitForEvent('dialog', { timeout: 1500 });
    await page.evaluate(() => history.back());
    const backDialog = await backDecision;
    expect(backDialog.type()).toBe('confirm');
    await backDialog.dismiss();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(edit.getByLabel('Nombre', { exact: true })).toHaveValue(
      'Revisión editada',
    );
    const unloadDecision = page.waitForEvent('dialog', { timeout: 1500 });
    await page.evaluate(() => {
      setTimeout(() => location.reload(), 0);
    });
    const unloadDialog = await unloadDecision;
    expect(unloadDialog.type()).toBe('beforeunload');
    await unloadDialog.dismiss();
    await expect(edit.getByLabel('Nombre', { exact: true })).toHaveValue(
      'Revisión editada',
    );
    await edit
      .getByRole('button', { name: 'Guardar usuario', exact: true })
      .click();
    await expect(edit).toHaveCount(0);
    await expect(
      row.getByText('Revisión editada', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('users-directory.png'),
      fullPage: true,
    });
    await page.reload();
    await search.fill(email);
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: email })
        .getByText('Revisión editada', { exact: true }),
    ).toBeVisible();
    await page.getByLabel('Rol global', { exact: true }).selectOption('ADMIN');
    await expect(
      page.getByText('No hay usuarios con estos filtros.'),
    ).toBeVisible();
    await page
      .getByLabel('Rol global', { exact: true })
      .selectOption('EMPLOYEE');
    await page
      .getByRole('button', { name: 'Generar código para Revisión editada' })
      .click();
    await expect(
      page.getByRole('region', { name: 'Código temporal' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Ocultar código' }).click();
    await expect(
      page.getByRole('region', { name: 'Código temporal' }),
    ).toHaveCount(0);
    await search.fill('Revisión editada');
    await row.getByRole('button', { name: 'Editar Revisión editada' }).click();
    const filteredEditor = page.getByRole('dialog', {
      name: 'Editar usuario',
      exact: true,
    });
    await filteredEditor
      .getByLabel('Nombre', { exact: true })
      .fill('Cuenta final QA');
    await filteredEditor
      .getByRole('button', { name: 'Guardar usuario', exact: true })
      .click();
    await expect(filteredEditor).toHaveCount(0);
    await expect(row).toHaveCount(0);
    await expect(search).toBeFocused();
  } finally {
    const ids = (
      await db.pool.query('select id from users where email=$1', [email])
    ).rows.map((r) => r.id as string);
    await deleteTestUsers(db, ids);
    await db.pool.end();
  }
});

test('Usuarios mantiene composición, foco y reflow en ambos temas y siete anchos', async ({
  page,
  account,
}, testInfo) => {
  const desktop = testInfo.project.name === 'desktop';
  const widths = desktop ? [768, 1024, 1280, 1440] : [320, 360, 390];
  const metrics = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const mode of ['light', 'dark']) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/usuarios');
      await page
        .getByRole('combobox', { name: 'Tema de apariencia' })
        .selectOption(mode);
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      await expect(
        page.getByRole('row').filter({ hasText: account.email }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        headerHeight: document.querySelector('header')!.getBoundingClientRect()
          .height,
        tableWidth: document.querySelector('table')!.getBoundingClientRect()
          .width,
        mainTop: document.querySelector('main')!.getBoundingClientRect().top,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
      expect(geometry.headerHeight).toBe(72);
      metrics.push({ theme: mode, ...geometry });
      await page.screenshot({
        path: testInfo.outputPath(`users-${mode}-${width}.png`),
        fullPage: true,
      });
    }
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    const editor = page.getByRole('dialog', {
      name: 'Crear usuario',
      exact: true,
    });
    await expect(editor.getByLabel('Nombre', { exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      editor.getByRole('button', { name: 'Cerrar panel' }),
    ).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      editor.getByRole('button', { name: 'Cancelar', exact: true }),
    ).toBeFocused();
    await page.screenshot({
      path: testInfo.outputPath(
        `editor-${mode}-${desktop ? 'desktop' : 'mobile'}.png`,
      ),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Nuevo usuario' }),
    ).toBeFocused();
    if (desktop) {
      await page.getByRole('button', { name: 'Contraer navegación' }).click();
      await page.screenshot({
        path: testInfo.outputPath(`sidebar-collapsed-${mode}.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Expandir navegación' }).click();
    } else {
      await page.getByRole('button', { name: 'Más secciones' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Menú principal' }),
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`sidebar-mobile-${mode}.png`),
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Más secciones' }),
      ).toBeFocused();
    }
  }
  await testInfo.attach('shell-geometry', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  });
});
