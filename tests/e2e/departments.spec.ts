import { randomUUID } from 'node:crypto';
import type { Route } from '@playwright/test';
import { expect, test, openMainNavigation } from './fixtures.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test'))
  throw new Error('E2E requiere TEST_DATABASE_URL terminada en _test.');

test('crea, edita y elimina departamentos con persistencia tras recargar', async ({
  page,
}, testInfo) => {
  const database = createDatabase(testUrl as string);
  const ids: string[] = [];
  const name = `Equipo E2E ${testInfo.project.name} ${randomUUID()}`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/');
    await openMainNavigation(page);
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Departamentos', exact: true })
      .click();
    await expect(page).toHaveURL(/\/departamentos$/);
    await expect(
      page.getByRole('heading', { name: 'Departamentos', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Nuevo departamento' }).click();
    const input = page.getByRole('textbox', {
      name: 'Nombre del departamento',
    });
    await page.getByRole('button', { name: 'Crear departamento' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'El nombre es obligatorio.',
    );
    await input.fill(`  ${name}  `);
    const creation = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/departments') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear departamento' }).click();
    const response = await creation;
    const body = await response.json();
    if (typeof body.id === 'string') ids.push(body.id);
    expect(response.status()).toBe(201);
    expect(body.name).toBe(name);
    await expect(page.getByRole('status')).toContainText(
      `Departamento creado: ${name}`,
    );
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    const stored = await database.pool.query(
      'select id, name from departments where id = $1',
      [body.id],
    );
    expect(stored.rows).toEqual([{ id: body.id, name }]);
    await page.reload();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await openMainNavigation(page);
    await expect(
      page
        .getByRole('navigation', { name: 'Principal', exact: true })
        .getByRole('link', { name: 'Departamentos', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (await page.getByRole('dialog', { name: 'Menú principal' }).isVisible())
      await page.keyboard.press('Escape');
    await page.screenshot({
      path: testInfo.outputPath('departments.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Nuevo departamento' }).click();
    await input.fill(name.toUpperCase());
    const duplicate = page.waitForResponse(
      (result) =>
        result.url().endsWith('/api/departments') &&
        result.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear departamento' }).click();
    expect((await duplicate).status()).toBe(409);
    await expect(page.getByRole('alert')).toContainText(
      'Ya existe un departamento con ese nombre.',
    );
    await expect(input).toHaveValue(name.toUpperCase());
    const count = await database.pool.query(
      'select count(*)::int as count from departments where lower(name) = lower($1)',
      [name],
    );
    expect(count.rows).toEqual([{ count: 1 }]);
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('dialog', { name: 'Crear departamento', exact: true })
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click();
    await page
      .getByRole('button', { name: `Acciones de ${name}`, exact: true })
      .click();
    await page
      .getByRole('menuitem', { name: 'Editar departamento', exact: true })
      .click();
    const updatedName = `Área actualizada ${randomUUID()}`;
    await input.fill(` ${updatedName} `);
    const updating = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/departments/${body.id}`) &&
        r.request().method() === 'PUT',
    );
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const slowSave = async (route: Route) => {
      if (route.request().method() === 'PUT') await saveGate;
      await route.continue();
    };
    const updatePath = `**/api/departments/${body.id}`;
    await page.route(updatePath, slowSave);
    try {
      await page
        .getByRole('button', { name: 'Guardar cambios', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Guardando…' }),
      ).toBeDisabled();
      const unloading = page.waitForEvent('dialog', { timeout: 2000 });
      await page.evaluate(() => {
        setTimeout(() => location.reload(), 0);
      });
      const unloadDialog = await unloading;
      expect(unloadDialog.type()).toBe('beforeunload');
      await unloadDialog.dismiss();
      await expect(input).toHaveValue(` ${updatedName} `);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.addEventListener(
              'popstate',
              () => {
                setTimeout(resolve, 0);
              },
              { once: true },
            );
            history.back();
          }),
      );
      await expect(page).toHaveURL(/\/departamentos$/);
      await expect(
        page.getByRole('button', { name: 'Guardando…' }),
      ).toBeDisabled();
      await expect(input).toHaveValue(` ${updatedName} `);
    } finally {
      releaseSave();
    }
    const updatedResponse = await updating;
    expect(updatedResponse.status()).toBe(200);
    await updatedResponse.finished();
    await page.unroute(updatePath, slowSave);
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
    expect(
      (
        await database.pool.query('select name from departments where id=$1', [
          body.id,
        ])
      ).rows,
    ).toEqual([{ name: updatedName }]);
    await page
      .getByRole('button', { name: `Acciones de ${updatedName}`, exact: true })
      .click();
    await page
      .getByRole('menuitem', { name: 'Eliminar departamento', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Cancelar eliminación', exact: true })
      .click();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: `Acciones de ${updatedName}`, exact: true })
      .click();
    await page
      .getByRole('menuitem', { name: 'Eliminar departamento', exact: true })
      .click();
    const removing = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/departments/${body.id}`) &&
        r.request().method() === 'DELETE',
    );
    let releaseReload!: () => void;
    let sawReload!: () => void;
    const reloadGate = new Promise<void>((resolve) => {
      releaseReload = resolve;
    });
    const reloadStarted = new Promise<void>((resolve) => {
      sawReload = resolve;
    });
    const slowReload = async (route: Route) => {
      sawReload();
      await reloadGate;
      await route.continue();
    };
    await page.route('**/api/departments', slowReload);
    const refreshed = page.waitForResponse('**/api/departments');
    try {
      await page
        .getByRole('button', { name: 'Confirmar eliminación', exact: true })
        .click();
      expect((await removing).status()).toBe(204);
      await reloadStarted;
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Cancelar eliminación' }),
      ).toBeDisabled();
    } finally {
      releaseReload();
    }
    await (await refreshed).finished();
    await page.unroute('**/api/departments', slowReload);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(
      page.getByRole('searchbox', { name: 'Buscar departamentos' }),
    ).toBeFocused();
    await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
    expect(
      (
        await database.pool.query('select id from departments where id=$1', [
          body.id,
        ])
      ).rows,
    ).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    try {
      if (ids.length)
        await database.pool.query(
          'delete from departments where id = any($1::uuid[])',
          [ids],
        );
    } finally {
      await database.pool.end();
    }
  }
});
