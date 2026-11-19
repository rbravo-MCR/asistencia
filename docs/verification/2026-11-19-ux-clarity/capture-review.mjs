/* global document, innerWidth */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const origin = 'http://127.0.0.1:5173';
const email = process.env.UX_REVIEW_EMAIL;
const password = process.env.UX_REVIEW_PASSWORD;
if (!email || !password)
  throw new Error(
    'Usa credenciales de una cuenta ficticia local en el entorno del proceso.',
  );
const directory = new URL('./after/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const captures = [];
try {
  const authentication = await browser.newContext({ baseURL: origin });
  const login = await authentication.request.post('/api/auth/login', {
    headers: { origin },
    data: { identifier: email, password },
  });
  expect(login.status()).toBe(200);
  const session = await login.json();
  const storageState = await authentication.storageState();
  await authentication.close();
  for (const width of [1440, 390, 320])
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        baseURL: origin,
        viewport: { width, height: 1000 },
        storageState,
        reducedMotion: 'reduce',
      });
      try {
        await context.addInitScript(
          (theme) => localStorage.setItem('mcr-theme', theme),
          theme,
        );
        const staff = await (
          await context.request.get('/api/employees')
        ).json();
        const own = staff.items.find(
          (person) => person.id === session.employeeId,
        );
        if (!own || !/ficticio|prueba/i.test(own.fullName))
          throw new Error(
            'La captura exige un empleado ficticio, no datos personales reales.',
          );
        const get = async (path) => {
          const response = await context.request.get(`/api${path}`);
          expect(response.status()).toBe(200);
          return response.json();
        };
        if ((await get('/requests')).items.length)
          throw new Error(
            'No se capturan motivos de solicitudes existentes. Usa fixtures sintéticas.',
          );
        const templates = (await get('/shift-templates')).items;
        const template = templates.find(
          (item) =>
            item.active &&
            item.category === own.category &&
            item.modality === 'HOME_OFFICE',
        );
        if (!template)
          throw new Error(
            'Se requiere una plantilla remota para el perfil ficticio.',
          );
        const page = await context.newPage();
        let submitted = 0;
        page.on('request', (request) => {
          if (request.method() === 'POST') submitted++;
        });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const capture = async (name) => {
          await expect(page.locator('main h1')).toBeVisible();
          await expect(
            page
              .locator('[role="status"]')
              .filter({ hasText: /^(Cargando|Verificando)/ }),
          ).toHaveCount(0);
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          const file = `${name}-${theme}-${width}.png`;
          await page.screenshot({
            path: new URL(file, directory).pathname,
            fullPage: true,
          });
          captures.push({ file, theme, width, submitted });
        };
        for (const [name, path] of [
          ['01-inicio', '/'],
          ['02-plantillas', '/turnos'],
          ['03-asignacion', '/calendario'],
          ['04-dias', '/vacaciones'],
          ['05-solicitudes', '/solicitudes'],
        ]) {
          await page.goto(path);
          if (path === '/calendario')
            await page
              .getByLabel('Empleado', { exact: true })
              .selectOption(own.id);
          await capture(name);
          if (path === '/calendario') {
            await page
              .getByRole('button', { name: 'Asignar turno', exact: true })
              .click();
            await capture('03b-asignacion-formulario');
            await page
              .getByLabel('Empleado del turno', { exact: true })
              .selectOption(own.id);
            await page
              .getByLabel('Plantilla', { exact: true })
              .selectOption(template.id);
            await page
              .getByLabel('Fecha de inicio', { exact: true })
              .fill('2026-11-23');
            await capture('03c-asignacion-revisada');
            page.once('dialog', (dialog) => dialog.accept());
            await page
              .getByRole('button', { name: 'Cerrar panel', exact: true })
              .click();
          }
        }
        await page.getByRole('button', { name: /^Pedir vacaciones/ }).click();
        await capture('06-nueva-solicitud');
        await page
          .getByLabel('Período de vacaciones', { exact: true })
          .selectOption('1');
        await page.getByLabel('Desde', { exact: true }).fill('2026-12-07');
        await page.getByLabel('Hasta', { exact: true }).fill('2026-12-08');
        await page
          .getByLabel('Motivo de la solicitud', { exact: true })
          .fill('Prueba visual de vacaciones, sin enviar.');
        await capture('06b-solicitud-completada');
        await page
          .getByRole('button', { name: 'Revisar solicitud', exact: true })
          .click();
        await expect(
          page.getByRole('heading', {
            name: 'Revisa tu solicitud',
            exact: true,
          }),
        ).toBeFocused();
        await capture('07-revisar-solicitud');
        expect(submitted).toBe(0);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    }
  await writeFile(
    new URL('captures.json', directory),
    JSON.stringify({ captures, mutationsSubmitted: 0 }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      captures: captures.length,
      mutationsSubmitted: 0,
      directory: directory.pathname,
    }),
  );
} finally {
  await browser.close();
}
