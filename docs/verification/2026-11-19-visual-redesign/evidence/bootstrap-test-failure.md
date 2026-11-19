# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: appearance.spec.ts >> identidad y preferencia visual MCR >> aplica el tema guardado antes de que arranque React
- Location: tests/e2e/appearance.spec.ts:76:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: ""
Received: "Saltar al contenidoInicioIngresarEstado del sistemaTemaClaroOscuroSistemaIngresarAccede con tu cuenta de MCR.Número de usuario o correoContraseñaIngresarRecuperar accesoMCR · Uso interno"
```

# Page snapshot

```yaml
- generic [ref=e2]:
    - link "Saltar al contenido" [ref=e3] [cursor=pointer]:
        - /url: '#contenido'
    - generic [ref=e4]:
        - banner [ref=e5]:
            - generic [ref=e6]:
                - link "Ir al inicio" [ref=e7] [cursor=pointer]:
                    - /url: /
                    - img "MCR" [ref=e8]
                - navigation "Principal" [ref=e9]:
                    - link "Inicio" [ref=e10] [cursor=pointer]:
                        - /url: /
                    - link "Ingresar" [ref=e11] [cursor=pointer]:
                        - /url: /ingresar
                    - link "Estado del sistema" [ref=e12] [cursor=pointer]:
                        - /url: /estado
                - generic [ref=e13]:
                    - text: Tema
                    - combobox "Tema de apariencia" [ref=e14]:
                        - option "Claro"
                        - option "Oscuro" [selected]
                        - option "Sistema"
        - main [ref=e16]:
            - heading "Ingresar" [level=1] [ref=e17]
            - paragraph [ref=e18]: Accede con tu cuenta de MCR.
            - generic [ref=e19]:
                - generic [ref=e20]:
                    - generic [ref=e21]: Número de usuario o correo
                    - textbox "Número de usuario o correo" [ref=e22]
                - generic [ref=e23]:
                    - generic [ref=e24]: Contraseña
                    - textbox "Contraseña" [ref=e25]
                - button "Ingresar" [ref=e26] [cursor=pointer]
                - paragraph [ref=e27]:
                    - link "Recuperar acceso" [ref=e28] [cursor=pointer]:
                        - /url: /recuperar
        - contentinfo [ref=e29]: MCR · Uso interno
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { test as signedInTest, openMainNavigation } from './fixtures.js';
  3   |
  4   | const theme = (page: Page) =>
  5   |   page.getByRole('combobox', { name: 'Tema de apariencia' });
  6   | test.describe('identidad y preferencia visual MCR', () => {
  7   |   test('recuerda el tema explícito al recargar y no lo cambia con el sistema', async ({
  8   |     page,
  9   |   }) => {
  10  |     await page.emulateMedia({ colorScheme: 'light' });
  11  |     await page.goto('/ingresar');
  12  |     await theme(page).selectOption('dark');
  13  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  14  |     await page.reload();
  15  |     await expect(theme(page)).toHaveValue('dark');
  16  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  17  |     await page.emulateMedia({ colorScheme: 'dark' });
  18  |     await page.emulateMedia({ colorScheme: 'light' });
  19  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  20  |     expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
  21  |       'mcr-theme',
  22  |     ]);
  23  |     await theme(page).selectOption('light');
  24  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  25  |   });
  26  |
  27  |   test('sigue cambios del sistema y recupera una preferencia corrupta', async ({
  28  |     page,
  29  |   }) => {
  30  |     await page.addInitScript(() =>
  31  |       localStorage.setItem('mcr-theme', 'no-es-un-tema'),
  32  |     );
  33  |     await page.emulateMedia({ colorScheme: 'dark' });
  34  |     await page.goto('/ingresar');
  35  |     await expect(theme(page)).toHaveValue('system');
  36  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  37  |     await page.emulateMedia({ colorScheme: 'light' });
  38  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  39  |   });
  40  |
  41  |   test('permite cambiar tema aunque el navegador bloquee almacenamiento', async ({
  42  |     page,
  43  |   }) => {
  44  |     await page.addInitScript(() => {
  45  |       Object.defineProperty(window, 'localStorage', {
  46  |         get() {
  47  |           throw new DOMException('Bloqueado', 'SecurityError');
  48  |         },
  49  |       });
  50  |     });
  51  |     await page.emulateMedia({ colorScheme: 'light' });
  52  |     await page.goto('/ingresar');
  53  |     await theme(page).selectOption('dark');
  54  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  55  |     await page
  56  |       .getByLabel('Número de usuario o correo')
  57  |       .fill('prueba@example.test');
  58  |     await expect(page.getByLabel('Número de usuario o correo')).toHaveValue(
  59  |       'prueba@example.test',
  60  |     );
  61  |   });
  62  |
  63  |   test('sincroniza la preferencia entre pestañas del mismo origen', async ({
  64  |     page,
  65  |     context,
  66  |   }) => {
  67  |     await page.goto('/ingresar');
  68  |     const other = await context.newPage();
  69  |     await other.goto('/ingresar');
  70  |     await theme(page).selectOption('dark');
  71  |     await expect(theme(other)).toHaveValue('dark');
  72  |     await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  73  |     await other.close();
  74  |   });
  75  |
  76  |   test('aplica el tema guardado antes de que arranque React', async ({
  77  |     page,
  78  |   }) => {
  79  |     await page.addInitScript(() => localStorage.setItem('mcr-theme', 'dark'));
  80  |     await page.route('**/src/main.tsx', (route) => route.abort());
  81  |     await page.goto('/ingresar');
  82  |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
> 83  |     expect(await page.locator('#root').textContent()).toBe('');
      |                                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  84  |   });
  85  |
  86  |   test('carga fuente local y conserva fallback sin conexiones externas', async ({
  87  |     page,
  88  |   }) => {
  89  |     const external: string[] = [];
  90  |     page.on('request', (request) => {
  91  |       if (!request.url().startsWith('http://127.0.0.1:5183/'))
  92  |         external.push(request.url());
  93  |     });
  94  |     await page.goto('/ingresar');
  95  |     await page.evaluate(() => document.fonts.ready);
  96  |     expect(
  97  |       await page.evaluate(() =>
  98  |         document.fonts.check('400 16px "Google Sans"', 'México ñ á'),
  99  |       ),
  100 |     ).toBe(true);
  101 |     expect(
  102 |       await page.evaluate(() =>
  103 |         [...document.fonts].some(
  104 |           (font) =>
  105 |             font.family.includes('Google Sans') && font.status === 'loaded',
  106 |         ),
  107 |       ),
  108 |     ).toBe(true);
  109 |     expect(external).toEqual([]);
  110 |     await page.route('**/*.woff2', (route) => route.abort());
  111 |     await page.reload();
  112 |     await expect(
  113 |       page.getByRole('button', { name: 'Ingresar', exact: true }),
  114 |     ).toBeVisible();
  115 |     await page
  116 |       .getByLabel('Número de usuario o correo')
  117 |       .fill('sin-fuente@example.test');
  118 |     await expect(page.getByLabel('Número de usuario o correo')).toHaveValue(
  119 |       'sin-fuente@example.test',
  120 |     );
  121 |   });
  122 |
  123 |   for (const mode of ['light', 'dark'])
  124 |     test(`mantiene contraste de texto, acciones, campos y estados en ${mode}`, async ({
  125 |       page,
  126 |     }) => {
  127 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  128 |       await page.goto('/ingresar');
  129 |       await theme(page).selectOption(mode);
  130 |       await expect(page.locator('form')).toHaveCSS(
  131 |         'background-color',
  132 |         mode === 'dark' ? 'rgb(27, 27, 27)' : 'rgb(255, 255, 255)',
  133 |       );
  134 |       const ratios = await page.evaluate(() => {
  135 |         function rgb(value: string) {
  136 |           return value
  137 |             .match(/[\d.]+/g)!
  138 |             .slice(0, 3)
  139 |             .map(Number);
  140 |         }
  141 |         function luminance(c: number[]) {
  142 |           return c
  143 |             .map((x) => {
  144 |               const n = x / 255;
  145 |               return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  146 |             })
  147 |             .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i]!, 0);
  148 |         }
  149 |         function ratio(a: string, b: string) {
  150 |           const x = luminance(rgb(a)),
  151 |             y = luminance(rgb(b));
  152 |           return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  153 |         }
  154 |         const root = getComputedStyle(document.documentElement);
  155 |         const resolve = (name: string) => {
  156 |           const el = document.createElement('span');
  157 |           el.style.color = `var(${name})`;
  158 |           document.body.append(el);
  159 |           const color = getComputedStyle(el).color;
  160 |           el.remove();
  161 |           return color;
  162 |         };
  163 |         const button = getComputedStyle(document.querySelector('form button')!);
  164 |         const link = getComputedStyle(document.querySelector('form a')!);
  165 |         const panel = getComputedStyle(document.querySelector('form')!);
  166 |         const input = getComputedStyle(document.querySelector('form input')!);
  167 |         return {
  168 |           button: ratio(button.color, button.backgroundColor),
  169 |           link: ratio(link.color, panel.backgroundColor),
  170 |           text: ratio(
  171 |             getComputedStyle(document.body).color,
  172 |             getComputedStyle(document.body).backgroundColor,
  173 |           ),
  174 |           inputBoundary: ratio(input.borderTopColor, panel.backgroundColor),
  175 |           focus: ratio(resolve('--ring'), panel.backgroundColor),
  176 |           muted: ratio(resolve('--muted-foreground'), panel.backgroundColor),
  177 |           semantic: Object.fromEntries(
  178 |             ['success', 'warning', 'info', 'danger'].map((state) => [
  179 |               state,
  180 |               ratio(resolve(`--${state}-text`), panel.backgroundColor),
  181 |             ]),
  182 |           ),
  183 |           brand: root.getPropertyValue('--mcr-yellow').trim(),
```
