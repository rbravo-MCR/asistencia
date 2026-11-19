/* global document, innerWidth */
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium, expect } from '@playwright/test';

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir)
  throw new Error('Indica los dos directorios dist.');
const output = new URL('./production/', import.meta.url);
await mkdir(output, { recursive: true });
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
async function serve(directory) {
  const root = resolve(directory);
  const server = createServer(async (request, response) => {
    try {
      let file = resolve(
        root,
        `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`,
      );
      if (
        !file.startsWith(`${root}/`) ||
        !(await stat(file).catch(() => null))?.isFile()
      )
        file = resolve(root, 'index.html');
      response.writeHead(200, {
        'content-type': mime[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(await readFile(file));
    } catch {
      response.writeHead(500);
      response.end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
const id = '00000000-0000-4000-8000-000000000001';
const createdAt = '2026-11-19T12:00:00.000Z';
const policy = {
  id,
  version: 1,
  lateToleranceMinutes: 10,
  earlyEntryMinutes: 30,
  lateExitMinutes: 120,
  activatedAt: createdAt,
  createdAt,
};
const slot = {
  assignmentId: id,
  employeeId: id,
  employeeName: 'Revisión visual',
  workDate: '2026-11-19',
  startsAt: createdAt,
  endsAt: '2026-11-19T20:00:00.000Z',
  modality: 'HOME_OFFICE',
  timeZone: 'America/Merida',
  status: 'PUBLISHED',
  sessionId: null,
  policy,
  attempts: [],
  incidents: [],
  evaluations: [],
  summary: 'PENDING',
};
const leavePolicy = {
  id,
  version: 1,
  name: 'Política de laboratorio',
  entitlements: [{ fromYear: 1, days: 12 }],
  administrativeWeekdays: [1, 2, 3, 4, 5],
  operationalWeekdays: [1, 2, 3, 4, 5, 6, 7],
  excludeHolidays: true,
  createdAt,
};
const data = {
  '/vacation/balances': {
    items: [
      {
        employeeId: id,
        employeeName: 'Revisión visual',
        anniversaryYear: 1,
        entitlement: 12,
        balance: 10,
        reserved: 2,
        available: 8,
        approvedDays: 2,
        enjoyedDays: 0,
        movements: [],
      },
    ],
  },
  '/leave/configuration': { policy: leavePolicy, permissionTypes: [] },
  '/requests': { items: [] },
  '/dashboard': {
    generatedAt: createdAt,
    date: '2026-11-19',
    timeZone: 'America/Merida',
    teamVisible: true,
    unreadNotifications: 0,
    attendance: { shifts: [], incidents: [] },
    personal: {
      shift: null,
      balances: [{ anniversaryYear: 1, available: 8, reserved: 2 }],
    },
    pendingRequests: [],
  },
  '/attendance/me': {
    employee: {
      id,
      employeeNumber: 'E1',
      fullName: 'Revisión visual',
      category: 'OPERATIONAL',
      status: 'ACTIVE',
    },
    serverTime: createdAt,
    policy,
    pendingIncidents: [],
    items: [slot],
  },
  '/attendance/policy': policy,
  '/attendance/summary': { items: [slot] },
  '/auth/session': {
    user: {
      id,
      email: 'visual@example.test',
      name: 'Revisión visual',
      roles: ['ADMIN'],
      active: true,
      createdAt,
    },
    csrfToken: 'synthetic-lab-only',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    employeeId: id,
    departmentIds: [],
    managedDepartmentIds: [],
    permissions: {
      manageUsers: true,
      manageOrganization: true,
      viewAllEmployees: true,
    },
  },
  '/departments': {
    items: [{ id, name: 'Departamento de prueba', createdAt }],
  },
  '/users/directory': { items: [] },
  '/employees': {
    items: Array.from({ length: 12 }, (_, n) => ({
      id: `00000000-0000-4000-8000-${String(n + 10).padStart(12, '0')}`,
      employeeNumber: String(n + 1).padStart(6, '0'),
      fullName: `Persona QA ${String(n + 1).padStart(2, '0')}`,
      phoneNumber: null,
      address: null,
      departmentId: id,
      position: 'Analista de operaciones',
      joinedOn: '2024-02-29',
      category: n % 2 ? 'OPERATIONAL' : 'ADMINISTRATIVE',
      status: 'ACTIVE',
      supervisorId: null,
      userId: null,
      createdAt,
      updatedAt: createdAt,
    })),
  },
};
const servers = {
  before: await serve(beforeDir),
  after: await serve(afterDir),
};
const browser = await chromium.launch();
const measurements = [];
try {
  for (const screen of ['dashboard', 'vacation', 'requests'])
    for (const width of [390, 1440])
      for (const theme of ['light', 'dark'])
        for (let run = 0; run < 3; run++)
          for (const version of ['before', 'after']) {
            const context = await browser.newContext({
              viewport: { width, height: 941 },
              reducedMotion: 'reduce',
            });
            try {
              await context.addInitScript((theme) => {
                localStorage.setItem('mcr-theme', theme);
                globalThis.visualMetrics = { lcp: null, cls: 0 };
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries())
                    globalThis.visualMetrics.lcp = entry.startTime;
                }).observe({
                  type: 'largest-contentful-paint',
                  buffered: true,
                });
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries())
                    if (!entry.hadRecentInput)
                      globalThis.visualMetrics.cls += entry.value;
                }).observe({ type: 'layout-shift', buffered: true });
              }, theme);
              const page = await context.newPage();
              const errors = [];
              page.on('pageerror', (error) => errors.push(error.message));
              await page.route('**/api/**', async (route) => {
                const path = new URL(route.request().url()).pathname.slice(4);
                if (path === '/auth/session' && screen === 'login') {
                  await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: '{}',
                  });
                  return;
                }
                if (route.request().method() !== 'GET' || !data[path])
                  throw new Error(`Solicitud inesperada: ${path}`);
                await new Promise((done) => setTimeout(done, 120));
                await route.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify(data[path]),
                });
              });
              const path = {
                vacation: '/vacaciones',
                requests: '/solicitudes',
                dashboard: '/',
              }[screen];
              await page.goto(`${servers[version].url}${path}`);
              await expect(page.locator('main h1')).toBeVisible();
              await expect(
                page
                  .locator('main [role="status"]')
                  .filter({ hasText: /^(Cargando|Verificando)/ }),
              ).toHaveCount(0);
              if (screen === 'vacation')
                await expect(
                  page.getByText('Revisión visual · Año de servicio 1', {
                    exact: true,
                  }),
                ).toBeVisible();
              await expect(page.getByRole('alert')).toHaveCount(0);
              await page.evaluate(() => document.fonts.ready);
              await expect
                .poll(() =>
                  page
                    .locator('img')
                    .evaluateAll((images) =>
                      images.every(
                        (image) => image.complete && image.naturalWidth > 0,
                      ),
                    ),
                )
                .toBe(true);
              await page.waitForTimeout(750);
              const metrics = await page.evaluate(() => ({
                ...globalThis.visualMetrics,
                overflow: document.documentElement.scrollWidth > innerWidth,
              }));
              expect(errors).toEqual([]);
              if (run === 0)
                await page.screenshot({
                  path: new URL(
                    `${screen}-${version}-${theme}-${width}.png`,
                    output,
                  ).pathname,
                  fullPage: true,
                });
              measurements.push({
                screen,
                version,
                width,
                theme,
                run: run + 1,
                ...metrics,
                errors,
              });
            } finally {
              await context.close();
            }
          }
  await writeFile(
    new URL('measurements.json', output),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        browser: browser.version(),
        node: process.version,
        method:
          'Compilaciones NODE_ENV=production; contextos nuevos; HTTP no-store; APIs simuladas con 120 ms; DTOs sintéticos iguales por pantalla, sesión y política; Inicio sin turno con días disponibles, Vacaciones con saldo10/reserva2/disponible8 y Solicitudes sin registros; sin throttle de CPU/red, sin INP ni backend real; sin aislamiento de CPU del host; suite E2E terminada antes de esta medicion final. Orden emparejado before/after, tres corridas por viewport/tema. No equivale a rendimiento de campo ni valida reglas de negocio.',
        measurements,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify({
      measurements: measurements.length,
      output: output.pathname,
    }),
  );
} finally {
  await browser.close();
  await Promise.all(
    Object.values(servers).map(
      ({ server }) => new Promise((done) => server.close(done)),
    ),
  );
}
