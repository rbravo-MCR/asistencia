import { test, expect, type Page } from '@playwright/test';
import { test as signedInTest, openMainNavigation } from './fixtures.js';

const theme = (page: Page) =>
  page.getByRole('combobox', { name: 'Tema de apariencia' });
test.describe('identidad y preferencia visual MCR', () => {
  test('recuerda el tema explícito al recargar y no lo cambia con el sistema', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/ingresar');
    await theme(page).selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(theme(page)).toHaveValue('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
      'mcr-theme',
    ]);
    await theme(page).selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('sigue cambios del sistema y recupera una preferencia corrupta', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('mcr-theme', 'no-es-un-tema'),
    );
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/ingresar');
    await expect(theme(page)).toHaveValue('system');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('permite cambiar tema aunque el navegador bloquee almacenamiento', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Bloqueado', 'SecurityError');
        },
      });
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/ingresar');
    await theme(page).selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page
      .getByLabel('Número de usuario o correo')
      .fill('prueba@example.test');
    await expect(page.getByLabel('Número de usuario o correo')).toHaveValue(
      'prueba@example.test',
    );
  });

  test('sincroniza la preferencia entre pestañas del mismo origen', async ({
    page,
    context,
  }) => {
    await page.goto('/ingresar');
    const other = await context.newPage();
    await other.goto('/ingresar');
    await theme(page).selectOption('dark');
    await expect(theme(other)).toHaveValue('dark');
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
    await other.close();
  });

  test('aplica el tema guardado antes de que arranque React', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('mcr-theme', 'dark'));
    let entryBlocked = false;
    await page.route(
      (url) => url.pathname === '/src/main.tsx',
      (route) => {
        entryBlocked = true;
        return route.abort();
      },
    );
    await page.goto('/ingresar');
    expect(entryBlocked).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.locator('#root').textContent()).toBe('');
  });

  test('carga fuente local y conserva fallback sin conexiones externas', async ({
    page,
  }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:5183/'))
        external.push(request.url());
    });
    await page.goto('/ingresar');
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        document.fonts.check('400 16px "Google Sans"', 'México ñ á'),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        [...document.fonts].some(
          (font) =>
            font.family.includes('Google Sans') && font.status === 'loaded',
        ),
      ),
    ).toBe(true);
    expect(external).toEqual([]);
    await page.route('**/*.woff2', (route) => route.abort());
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Ingresar', exact: true }),
    ).toBeVisible();
    await page
      .getByLabel('Número de usuario o correo')
      .fill('sin-fuente@example.test');
    await expect(page.getByLabel('Número de usuario o correo')).toHaveValue(
      'sin-fuente@example.test',
    );
  });

  for (const mode of ['light', 'dark'])
    test(`mantiene contraste de texto, acciones, campos y estados en ${mode}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/ingresar');
      await theme(page).selectOption(mode);
      await expect(page.locator('form')).toHaveCSS(
        'background-color',
        mode === 'dark' ? 'rgb(27, 27, 27)' : 'rgb(255, 255, 255)',
      );
      const ratios = await page.evaluate(() => {
        function rgb(value: string) {
          return value
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
        }
        function luminance(c: number[]) {
          return c
            .map((x) => {
              const n = x / 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i]!, 0);
        }
        function ratio(a: string, b: string) {
          const x = luminance(rgb(a)),
            y = luminance(rgb(b));
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        }
        const root = getComputedStyle(document.documentElement);
        const resolve = (name: string) => {
          const el = document.createElement('span');
          el.style.color = `var(${name})`;
          document.body.append(el);
          const color = getComputedStyle(el).color;
          el.remove();
          return color;
        };
        const button = getComputedStyle(
          document.querySelector('form button[type="submit"]')!,
        );
        const link = getComputedStyle(document.querySelector('form a')!);
        const panel = getComputedStyle(document.querySelector('form')!);
        const input = getComputedStyle(document.querySelector('form input')!);
        return {
          button: ratio(button.color, button.backgroundColor),
          link: ratio(link.color, panel.backgroundColor),
          text: ratio(
            getComputedStyle(document.body).color,
            getComputedStyle(document.body).backgroundColor,
          ),
          inputBoundary: ratio(input.borderTopColor, panel.backgroundColor),
          focus: ratio(resolve('--ring'), panel.backgroundColor),
          muted: ratio(resolve('--muted-foreground'), panel.backgroundColor),
          semantic: Object.fromEntries(
            ['success', 'warning', 'info', 'danger'].map((state) => [
              state,
              ratio(resolve(`--${state}-text`), panel.backgroundColor),
            ]),
          ),
          brand: root.getPropertyValue('--mcr-yellow').trim(),
        };
      });
      expect(ratios.brand.toUpperCase()).toBe('#FADB25');
      for (const key of ['button', 'link', 'text', 'muted'] as const)
        expect(ratios[key], key).toBeGreaterThanOrEqual(4.5);
      for (const [state, contrast] of Object.entries(ratios.semantic))
        expect(contrast, state).toBeGreaterThanOrEqual(4.5);
      expect(ratios.inputBoundary).toBeGreaterThanOrEqual(3);
      expect(ratios.focus).toBeGreaterThanOrEqual(3);
      await page.getByLabel('Número de usuario o correo').focus();
      await expect(page.getByLabel('Número de usuario o correo')).toBeFocused();
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      await expect(page.getByRole('alert').first()).toBeVisible();
      await page.emulateMedia({ forcedColors: 'active' });
      await expect(theme(page)).toBeVisible();
      await page
        .getByLabel('Número de usuario o correo')
        .fill('alto-contraste@example.test');
      await expect(page.getByLabel('Número de usuario o correo')).toHaveValue(
        'alto-contraste@example.test',
      );
    });
});

test('las variantes destructiva, deshabilitada e inválida usan los tokens en el espécimen local', async ({
  page,
}) => {
  await page.goto('/design-system.html');
  await expect(
    page.getByRole('button', { name: 'Eliminar ejemplo' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
  await expect(page.getByLabel('Campo con error')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  for (const mode of ['light', 'dark']) {
    await theme(page).selectOption(mode);
    const destructive = page.getByRole('button', { name: 'Eliminar ejemplo' });
    const colors = await destructive.evaluate((el) => {
      const css = getComputedStyle(el);
      return { background: css.backgroundColor, foreground: css.color };
    });
    expect(colors.background).toBe('rgb(184, 17, 17)');
    expect(colors.foreground).toBe('rgb(255, 255, 255)');
    await destructive.focus();
    expect(
      await destructive.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe('solid');
    await page.screenshot({
      path: `docs/verification/2026-11-18-mcr-tokens/screenshots/specimen-${page.viewportSize()!.width}-${mode}.png`,
      fullPage: true,
    });
  }
});

// The controls are from the actual calendar, not the specimen.

signedInTest(
  'los campos reales del calendario mantienen bordes accesibles en ambos temas',
  async ({ page }) => {
    await page.goto('/calendario');
    const control = page.getByLabel('Empleado', { exact: true });
    for (const mode of ['light', 'dark']) {
      await theme(page).selectOption(mode);
      const colors = await control.evaluate((el) => ({
        border: getComputedStyle(el).borderTopColor,
        background: getComputedStyle(el).backgroundColor,
      }));
      const lum = (color: string) =>
        color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            const x = v / 255;
            return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          })
          .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      const a = lum(colors.border),
        b = lum(colors.background);
      expect(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      ).toBeGreaterThanOrEqual(3);
    }
  },
);

signedInTest(
  'el calendario y navegación conservan selección distinta del foco en colores forzados',
  async ({ page }) => {
    await page.goto('/calendario');
    const control = page.getByLabel('Empleado', { exact: true });
    await page.emulateMedia({ forcedColors: 'active' });
    const days = page
      .getByRole('group', { name: 'Días del mes' })
      .getByRole('button');
    await days.first().click();
    await control.focus();
    expect(
      await days.first().evaluate((el) => getComputedStyle(el).borderStyle),
    ).toBe('double');
    expect(
      await days.nth(1).evaluate((el) => getComputedStyle(el).borderStyle),
    ).toBe('solid');
    await openMainNavigation(page);
    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    await page.getByRole('heading', { name: /^Hola,/ }).waitFor();
    const navigation = await openMainNavigation(page);
    const active = navigation.getByRole('link', {
      name: 'Inicio',
      exact: true,
    });
    await navigation.getByRole('link', { name: 'Avisos', exact: true }).focus();
    expect(
      await active.evaluate((el) => getComputedStyle(el).textDecorationLine),
    ).toContain('underline');
    const unfocused = await active.evaluate(
      (el) => getComputedStyle(el).outlineWidth,
    );
    await page.keyboard.press('Tab');
    await active.focus();
    await expect(active).toBeFocused();
    expect(await active.evaluate((el) => el.matches(':focus-visible'))).toBe(
      true,
    );
    expect(
      await active.evaluate((el) => getComputedStyle(el).outlineWidth),
    ).not.toBe(unfocused);
  },
);

signedInTest(
  'descarga el módulo de calendario solo al navegar hacia él',
  async ({ page }) => {
    const modules: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/features/planning/calendar-page'))
        modules.push(request.url());
    });
    await page.goto('/cuenta', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: 'Mi cuenta', exact: true }),
    ).toBeVisible();
    expect(modules).toEqual([]);
    await openMainNavigation(page);
    await page
      .getByRole('link', { name: 'Asignar turnos', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Asignar turnos', exact: true }),
    ).toBeVisible();
    expect(modules.length).toBeGreaterThan(0);
  },
);

test('mantiene el acceso público sin mostrar el sidebar mientras verifica la sesión', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const pending = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route('**/api/auth/session', async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/ingresar', { waitUntil: 'domcontentloaded' });
    await pending;
    await expect(
      page.getByRole('heading', { name: 'Ingresar', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: 'Navegación de MCR' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Abrir menú principal' }),
    ).toHaveCount(0);
    const response = page.waitForResponse('**/api/auth/session');
    release();
    expect((await response).status()).toBe(401);
    await expect(
      page.getByLabel('Número de usuario o correo', { exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
});
