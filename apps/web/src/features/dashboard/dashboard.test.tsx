import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { Providers } from '@/app/providers';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
  at = '2030-01-11T01:00:00.000Z';
const session = {
  user: {
    id,
    email: 'ana@example.test',
    name: 'Ana',
    roles: ['EMPLOYEE'],
    active: true,
    createdAt: at,
  },
  csrfToken: 'csrf',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  employeeId: id,
  departmentIds: [],
  managedDepartmentIds: [],
  permissions: {
    manageUsers: false,
    manageOrganization: false,
    viewAllEmployees: false,
  },
};
const data = {
  generatedAt: at,
  date: '2030-01-10',
  timeZone: 'America/Merida',
  teamVisible: false,
  unreadNotifications: 123,
  attendance: { shifts: [], incidents: [] },
  personal: { shift: null, balances: [] },
  pendingRequests: [],
};
function mount(path = '/', admin = false, fail = false, linked = true) {
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/auth/session')
        return new Response(
          JSON.stringify({
            ...session,
            employeeId: linked ? id : null,
            permissions: {
              manageUsers: admin,
              manageOrganization: admin,
              viewAllEmployees: admin,
            },
          }),
        );
      if (url === '/api/dashboard')
        return fail
          ? new Response('{}', { status: 503 })
          : new Response(
              JSON.stringify({
                ...data,
                personal: linked ? data.personal : null,
              }),
            );
      if (url === '/api/configuration/status')
        return new Response(
          JSON.stringify({
            generatedAt: at,
            date: '2030-01-10',
            throughDate: '2030-01-16',
            timeZone: 'America/Merida',
            issues: [
              {
                code: 'LEAVE_POLICY_REQUIRED',
                title: 'Falta política de vacaciones',
                detail: 'Configura la política empresarial.',
                count: 1,
                severity: 'WARNING',
                href: '/politicas-ausencias',
              },
            ],
          }),
        );
      return new Response('{}', { status: 404 });
    }),
  );
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}
afterEach(() => vi.unstubAllGlobals());
it('shows server day, no invented balance and exact unread count', async () => {
  mount();
  expect(
    await screen.findByRole('heading', { name: 'Mi jornada' }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText('Sin períodos concedidos'),
  ).toBeInTheDocument();
  expect(screen.getByText('123')).toBeInTheDocument();
  expect(screen.getAllByText(/2030-01-10/).length).toBeGreaterThan(0);
  expect(
    screen.queryByRole('link', { name: 'Configuración' }),
  ).not.toBeInTheDocument();
});
it('shows failure with retry instead of empty zero summaries', async () => {
  mount('/', false, true);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No se pudo cargar',
  );
  expect(screen.queryByText('Sin períodos concedidos')).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', { name: 'Reintentar carga' }),
  );
});
it('denies direct configuration to employees', async () => {
  mount('/configuracion');
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No tienes permiso',
  );
});
it('groups existing administration links and actionable diagnostics', async () => {
  mount('/configuracion', true);
  expect(
    await screen.findByRole('heading', {
      name: 'Configuración administrativa',
    }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText(/Falta política de vacaciones/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Política de asistencia' }),
  ).toHaveAttribute('href', '/configuracion/asistencia');
});
it('opens attendance using the validated civil interval from the dashboard link', async () => {
  mount('/asistencia?from=2030-01-30&to=2030-02-05');
  await screen.findByRole('heading', { name: 'Historial en tu alcance' });
  await vi.waitFor(() =>
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([url]) =>
            url === '/api/attendance/summary?from=2030-01-30&to=2030-02-05',
        ),
    ).toBe(true),
  );
});
it('aligns a linked calendar interval with its actual weekday', async () => {
  mount('/calendario?from=2026-11-17&to=2026-11-23');
  const day = await screen.findByRole('button', {
    name: '2026-11-17, 0 turnos',
  });
  const grid = screen.getByRole('group', { name: 'Días del mes' });
  expect(Array.from(grid.children).indexOf(day)).toBe(8); // Seven weekday headers, one Monday spacer.
});

it('offers direct vacation creation and schedule tasks to an employee', async () => {
  mount();
  await screen.findByRole('heading', { name: 'Mi jornada' });
  const main = within(screen.getByRole('main'));
  expect(
    main.getByRole('link', { name: 'Solicitar vacaciones' }),
  ).toHaveAttribute('href', '/solicitudes?create=VACATION');
  expect(main.getByRole('link', { name: 'Mi horario' })).toHaveAttribute(
    'href',
    '/calendario',
  );
  expect(
    main.queryByRole('link', { name: 'Asignar turnos' }),
  ).not.toBeInTheDocument();
  expect(
    main.queryByRole('link', { name: 'Administrar días' }),
  ).not.toBeInTheDocument();
});

it('keeps management tasks available to an unlinked manager with a specific next step', async () => {
  mount('/', true, false, false);
  await screen.findByRole('heading', { name: 'Mi jornada' });
  const main = within(screen.getByRole('main'));
  expect(
    main.getByRole('link', { name: 'Consultar horarios' }),
  ).toHaveAttribute('href', '/calendario');
  expect(
    main.queryByRole('link', { name: 'Mi horario' }),
  ).not.toBeInTheDocument();
  expect(main.getByRole('link', { name: 'Asignar turnos' })).toHaveAttribute(
    'href',
    '/calendario',
  );
  expect(main.getByRole('link', { name: 'Administrar días' })).toHaveAttribute(
    'href',
    '/vacaciones?view=team',
  );
  expect(
    main.getByRole('link', { name: 'Revisar vinculación en Empleados' }),
  ).toHaveAttribute('href', '/empleados');
  expect(main.getByText(/no tiene un empleado activo vinculado/)).toBeVisible();
});

it('directs an unlinked reader to HR without an employee management shortcut', async () => {
  mount('/', false, false, false);
  await screen.findByRole('heading', { name: 'Mi jornada' });
  const main = within(screen.getByRole('main'));
  expect(
    main.getByText(/Solicita a RR. HH. revisar la vinculación/),
  ).toBeVisible();
  expect(
    main.queryByRole('link', { name: 'Revisar vinculación en Empleados' }),
  ).not.toBeInTheDocument();
});
