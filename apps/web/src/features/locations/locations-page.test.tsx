import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { Providers } from '@/app/providers';

const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));

it('conserva payload, CSRF y borrador tras conflicto; espera el listado antes de cerrar', async () => {
  let fail = true;
  let reloading = false;
  let release!: (response: Response) => void;
  const deferred = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
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
    if (url === '/api/locations' && init?.method === 'POST') {
      if (fail)
        return json(
          {
            error: {
              code: 'CONFLICT',
              requestId: id,
              message: 'El centro ya existe.',
            },
          },
          409,
        );
      reloading = true;
      return new Response(null, { status: 204 });
    }
    if (url === '/api/locations' && reloading) return deferred;
    return json({ items: [] });
  });
  vi.stubGlobal('fetch', fetch);
  render(
    <Providers>
      <RouterProvider
        router={createAppRouter(
          createMemoryHistory({ initialEntries: ['/ubicaciones'] }),
        )}
      />
    </Providers>,
  );
  expect(screen.queryByLabelText('Nombre del centro')).not.toBeInTheDocument();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nuevo centro' }),
  );
  await userEvent.type(
    screen.getByLabelText('Nombre del centro'),
    '  Mérida  ',
  );
  await userEvent.type(screen.getByLabelText('Latitud'), '21.03');
  await userEvent.type(screen.getByLabelText('Longitud'), '-89.62');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar centro' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'El centro ya existe.',
  );
  expect(screen.getByLabelText('Nombre del centro')).toHaveValue('  Mérida  ');
  expect(fetch).toHaveBeenCalledWith(
    '/api/locations',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'x-csrf-token': 'csrf-test' }),
      body: JSON.stringify({
        name: 'Mérida',
        latitude: 21.03,
        longitude: -89.62,
        radiusMeters: 10,
        maxAccuracyMeters: 10,
        active: true,
      }),
    }),
  );
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Guardar centro' }));
  await waitFor(() => expect(reloading).toBe(true));
  expect(screen.getByLabelText('Nombre del centro')).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(screen.getByLabelText('Nombre del centro')).toHaveValue('  Mérida  ');
  release(json({ items: [] }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
});
