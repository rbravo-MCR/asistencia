import { test, expect } from './fixtures.js';
import { test as publicTest } from '@playwright/test';

publicTest(
  'acceso MCR permite visibilidad de clave, recuperación y temas sin desbordar',
  async ({ page }, info) => {
    publicTest.setTimeout(60_000);
    const widths =
      info.project.name === 'desktop'
        ? [320, 360, 390, 768, 1024, 1280, 1440]
        : [390];
    await page.goto('/ingresar');
    const password = page.getByLabel('Contraseña', { exact: true });
    await password.fill('Texto QA con espacios ');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue('Texto QA con espacios ');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await password.clear();
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
          path: info.outputPath(`login-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    }
    await page
      .getByRole('link', { name: 'Recuperar acceso', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Recuperar acceso', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Código de recuperación', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Nueva contraseña', { exact: true }),
    ).toHaveAttribute('autocomplete', 'new-password');
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
          path: info.outputPath(`recover-${theme}-${width}.png`),
          fullPage: true,
        });
      }
    }
  },
);

test('dashboard y búsqueda de secciones conservan datos, foco y reflow', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Buscar secciones' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Buscar secciones' });
  const search = dialog.getByRole('searchbox', { name: 'Buscar una sección' });
  await expect(search).toBeFocused();
  await search.fill('Política de asistencia');
  await expect(
    dialog.getByRole('link', { name: 'Política de asistencia', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  for (const theme of ['light', 'dark']) {
    await page
      .getByRole('combobox', { name: 'Tema de apariencia' })
      .selectOption(theme);
    for (const width of info.project.name === 'desktop'
      ? [320, 390, 768, 1024, 1440]
      : [390]) {
      await page.setViewportSize({ width, height: 941 });
      await expect(
        page.getByRole('heading', { name: 'Mi jornada', exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`dashboard-${theme}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await trigger.click();
  await dialog.getByRole('searchbox').fill('Mi cuenta');
  await dialog.getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mi cuenta', exact: true }),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath('account.png'),
    fullPage: true,
  });
});
