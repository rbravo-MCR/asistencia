import { render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/app/providers';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { UsersPage } from './users-page';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
  other = '7ff93c1e-33a0-4f04-b5d1-503f339d0c61',
  at = '2026-11-17T14:00:00.000Z';
function mount(superAdmin: boolean) {
  const owner = {
    id,
    email: 'owner@example.test',
    name: 'Owner',
    roles: ['SUPER_ADMIN'],
    active: true,
    createdAt: at,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url === '/api/auth/session'
              ? {
                  user: superAdmin
                    ? owner
                    : { ...owner, id: other, name: 'Admin', roles: ['ADMIN'] },
                  csrfToken: 'csrf',
                  expiresAt: new Date(Date.now() + 3600000).toISOString(),
                  employeeId: null,
                  departmentIds: [],
                  managedDepartmentIds: [],
                  permissions: {
                    manageUsers: true,
                    manageOrganization: true,
                    viewAllEmployees: true,
                  },
                }
              : { items: [owner] },
          ),
        ),
    ),
  );
  const root = createRootRoute({ component: UsersPage });
  const route = createRoute({ getParentRoute: () => root, path: '/' });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}
afterEach(() => vi.unstubAllGlobals());
it('shows the protected role but no owner modification or grant controls to ADMIN', async () => {
  mount(false);
  expect(await screen.findByText(/Cuenta protegida:/)).toBeVisible();
  expect(
    within(screen.getByRole('row', { name: /Owner/ })).getByText(
      'Super administrador',
    ),
  ).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
  expect(
    screen.queryByRole('checkbox', { name: 'Super administrador' }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(
    screen.queryByRole('button', { name: 'Editar Owner' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Generar código para Owner' }),
  ).not.toBeInTheDocument();
});
it('lets SUPER_ADMIN select the actual role and manage the protected owner', async () => {
  mount(true);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nuevo usuario' }),
  );
  expect(
    await screen.findByRole('checkbox', { name: 'Super administrador' }),
  ).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(
    await screen.findByRole('button', { name: 'Editar Owner' }),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Generar código para Owner' }),
  ).toBeVisible();
});
