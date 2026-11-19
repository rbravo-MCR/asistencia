import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { Providers } from '@/app/providers';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
function json(value: unknown) {
  return new Response(JSON.stringify(value));
}
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));
it('consulta páginas reales, reinicia offset al filtrar y permite leer el detalle sanitizado', async () => {
  const fetch = vi.fn(async (url: string) => {
    if (url === '/api/auth/session')
      return json({
        user: {
          id,
          email: 'admin@example.com',
          name: 'Administración',
          roles: ['ADMIN'],
          active: true,
          createdAt: '2026-11-12T15:00:00.000Z',
        },
        csrfToken: 'csrf-test',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        employeeId: null,
        departmentIds: [],
        managedDepartmentIds: [],
        permissions: {
          manageUsers: true,
          manageOrganization: true,
          viewAllEmployees: true,
        },
      });
    if (url === '/api/notifications')
      return json({ items: [], unreadCount: 0 });
    if (url.startsWith('/api/audit-events?'))
      return json({
        items: [
          {
            id,
            actorId: id,
            actorName: 'Administración',
            requestId: id,
            action: 'UPDATED',
            entityType: 'location',
            entityId: id,
            before: { name: 'Anterior' },
            after: { name: 'Centro actual' },
            createdAt: '2026-11-12T15:00:00.000Z',
          },
        ],
        total: 51,
      });
    throw new Error(`Petición inesperada ${url}`);
  });
  vi.stubGlobal('fetch', fetch);
  render(
    <Providers>
      <RouterProvider
        router={createAppRouter(
          createMemoryHistory({ initialEntries: ['/auditoria'] }),
        )}
      />
    </Providers>,
  );
  await userEvent.click(
    await screen.findByRole('button', {
      name: 'Ver cambios: UPDATED · location',
    }),
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('Centro actual');
  expect(screen.getByRole('dialog')).toHaveTextContent(id);
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/audit-events?limit=50&offset=50',
      expect.anything(),
    ),
  );
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Entidad'), 'location');
  await userEvent.type(screen.getByLabelText('Acción'), 'UPDATED');
  await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/audit-events?limit=50&offset=0&entityType=location&action=UPDATED',
      expect.anything(),
    ),
  );
});
