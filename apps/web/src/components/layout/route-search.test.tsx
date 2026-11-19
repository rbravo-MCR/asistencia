import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { Providers } from '@/app/providers';

function mount(manager = false) {
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url === '/api/auth/session'
              ? {
                  user: {
                    id: '00000000-0000-4000-8000-000000000001',
                    email: 'test@example.test',
                    name: 'Consulta',
                    roles: ['EMPLOYEE'],
                    active: true,
                    createdAt: '2026-11-19T12:00:00.000Z',
                  },
                  csrfToken: 'synthetic',
                  expiresAt: new Date(Date.now() + 3600000).toISOString(),
                  employeeId: null,
                  departmentIds: [],
                  managedDepartmentIds: [],
                  permissions: {
                    manageUsers: false,
                    manageOrganization: manager,
                    viewAllEmployees: false,
                  },
                }
              : { status: 'ok', database: 'ok' },
          ),
        ),
    ),
  );
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ['/cuenta'] }),
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}
afterEach(() => vi.unstubAllGlobals());

it('busca solo rutas autorizadas y restaura foco con Escape', async () => {
  mount();
  await screen.findByRole('heading', { name: 'Mi cuenta' });
  const trigger = screen.getByRole('button', { name: 'Buscar secciones' });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', {
    name: 'Buscar secciones',
  });
  const input = within(dialog).getByRole('searchbox', {
    name: 'Buscar una sección',
  });
  expect(input).toHaveFocus();
  await userEvent.type(input, 'Usuarios');
  expect(within(dialog).getByText('No encontramos secciones.')).toBeVisible();
  expect(
    within(dialog).queryByRole('link', { name: 'Usuarios' }),
  ).not.toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
});

it('permite navegar con teclado y no intercepta el atajo mientras se escribe', async () => {
  mount();
  await screen.findByRole('heading', { name: 'Mi cuenta' });
  const password = screen.getByLabelText('Contraseña actual', { exact: true });
  await userEvent.click(password);
  await userEvent.keyboard('{Control>}k{/Control}');
  expect(
    screen.queryByRole('dialog', { name: 'Buscar secciones' }),
  ).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', { name: 'Buscar secciones' }),
  );
  await userEvent.type(
    screen.getByRole('searchbox', { name: 'Buscar una sección' }),
    'Estado del sistema',
  );
  await userEvent.tab();
  expect(
    within(screen.getByRole('dialog', { name: 'Buscar secciones' })).getByRole(
      'link',
      { name: 'Estado del sistema' },
    ),
  ).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(
    await screen.findByRole('heading', { name: 'Estado del sistema' }),
  ).toBeVisible();
  expect(
    screen.queryByRole('dialog', { name: 'Buscar secciones' }),
  ).not.toBeInTheDocument();
});

it.each([
  ['calendario', 'Mis horarios', '/calendario'],
  ['horários', 'Mis horarios', '/calendario'],
  ['vacaciones', 'Días disponibles', '/vacaciones'],
  ['saldos', 'Días disponibles', '/vacaciones'],
])('encuentra %s por tarea sin ampliar permisos', async (query, name, href) => {
  mount();
  await screen.findByRole('heading', { name: 'Mi cuenta' });
  await userEvent.click(
    screen.getByRole('button', { name: 'Buscar secciones' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Buscar secciones' });
  await userEvent.type(within(dialog).getByRole('searchbox'), query);
  expect(within(dialog).getByRole('link', { name })).toHaveAttribute(
    'href',
    href,
  );
  expect(
    within(dialog).queryByRole('link', { name: 'Plantillas de turno' }),
  ).not.toBeInTheDocument();
});

it('permite descubrir asignaciones y plantillas al gestor', async () => {
  mount(true);
  await screen.findByRole('heading', { name: 'Mi cuenta' });
  await userEvent.click(
    screen.getByRole('button', { name: 'Buscar secciones' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Buscar secciones' });
  const input = within(dialog).getByRole('searchbox');
  await userEvent.type(input, 'asignar');
  expect(
    within(dialog).getByRole('link', { name: 'Asignar turnos' }),
  ).toHaveAttribute('href', '/calendario');
  await userEvent.clear(input);
  await userEvent.type(input, 'turnos');
  expect(
    within(dialog).getByRole('link', { name: 'Plantillas de turno' }),
  ).toHaveAttribute('href', '/turnos');
});
