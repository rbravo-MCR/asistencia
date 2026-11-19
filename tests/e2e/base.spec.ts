import { expect, test, openMainNavigation } from './fixtures.js';

test('la web confirma API y PostgreSQL reales sin errores de navegador', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
  const response = await page.request.get('/api/health/ready');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok', database: 'ok' });
  expect(await page.locator('html').getAttribute('lang')).toBe('es-MX');
  await openMainNavigation(page);
  expect(
    await page
      .getByRole('img', { name: 'México Car Rental' })
      .evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (await page.getByRole('dialog', { name: 'Menú principal' }).isVisible())
    await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('base.png'),
    fullPage: true,
  });
});

test('navega entre rutas, permite acceso directo y recupera una página 404', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await openMainNavigation(page);
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Estado del sistema' })
    .click();
  await expect(page).toHaveURL(/\/estado$/);
  await expect(
    page.getByRole('heading', { name: 'Estado del sistema' }),
  ).toBeVisible();
  await expect(page.getByText('Servicios disponibles')).toBeVisible();
  await openMainNavigation(page);
  await expect(
    page
      .getByRole('navigation', { name: 'Principal', exact: true })
      .getByRole('link', { name: 'Estado del sistema' }),
  ).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Estado del sistema' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
  await page.goto('/ruta-inexistente');
  await expect(
    page.getByRole('heading', { name: 'Página no encontrada' }),
  ).toBeVisible();
  await openMainNavigation(page);
  await expect(
    page.getByRole('navigation', { name: 'Principal' }),
  ).toBeVisible();
  if (await page.getByRole('dialog', { name: 'Menú principal' }).isVisible())
    await page.keyboard.press('Escape');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('404.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Volver al inicio' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
  expect(errors).toEqual([]);
});
