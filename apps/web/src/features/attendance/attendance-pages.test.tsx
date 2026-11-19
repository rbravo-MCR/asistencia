import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { Providers } from '@/app/providers';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const at = '2026-11-12T14:00:00.000Z';
const policy = {
  id,
  version: 1,
  lateToleranceMinutes: 10,
  earlyEntryMinutes: 30,
  lateExitMinutes: 120,
  activatedAt: at,
  createdAt: at,
};
const slot = {
  assignmentId: id,
  employeeId: id,
  employeeName: 'Ana Pérez',
  workDate: '2026-11-12',
  startsAt: at,
  endsAt: '2026-11-12T22:00:00.000Z',
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
const session = {
  user: {
    id,
    email: 'ana@example.com',
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
const incident = {
  id,
  sessionId: id,
  assignmentId: id,
  employeeId: id,
  kind: 'LOCATION_REQUIRED',
  createdAt: at,
  requiresReason: true,
  reasons: [],
};
const json = (data: unknown) => new Response(JSON.stringify(data));
async function mount(
  options: {
    linked?: boolean;
    onsite?: boolean;
    unknown?: boolean;
    incident?: boolean;
    conflict?: boolean;
    incidentsPage?: boolean;
    history?: object[];
  } = {},
) {
  const gps = vi.fn((_ok: PositionCallback, fail: PositionErrorCallback) =>
    fail({ code: 1 } as GeolocationPositionError),
  );
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: gps },
  });
  const bodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/auth/session')
        return json({
          ...session,
          employeeId: options.linked === false ? null : id,
        });
      if (url === '/api/attendance/policy') return json(policy);
      if (url === '/api/attendance/me')
        return json({
          employee:
            options.linked === false
              ? null
              : {
                  id,
                  employeeNumber: 'E1',
                  fullName: 'Ana Pérez',
                  category: 'OPERATIONAL',
                  status: 'ACTIVE',
                },
          policy,
          serverTime: at,
          items:
            options.linked === false
              ? []
              : [
                  {
                    ...slot,
                    modality: options.onsite ? 'ONSITE' : 'HOME_OFFICE',
                  },
                ],
          pendingIncidents: [],
        });
      if (url === '/api/attendance/punches') {
        bodies.push(JSON.parse(String(init?.body)));
        if (options.unknown) throw new TypeError('offline');
        if (options.conflict)
          return new Response(
            JSON.stringify({
              error: {
                code: 'ATTENDANCE_CONFLICT',
                message: 'Este marcaje ya existe.',
                requestId: id,
              },
            }),
            { status: 409 },
          );
        return json({
          attempt: {
            id,
            sessionId: id,
            assignmentId: id,
            employeeId: id,
            direction: 'ENTRY',
            recordedAt: at,
            accepted: true,
            rejectionCode: null,
            geoCheckId: null,
          },
          incidents: options.incident ? [incident] : [],
          requiresReason: !!options.incident,
        });
      }
      return json({ items: options.history ?? [] });
    }),
  );
  render(
    <Providers>
      <RouterProvider
        router={createAppRouter(
          createMemoryHistory({
            initialEntries: [
              options.incidentsPage ? '/incidencias' : '/asistencia',
            ],
          }),
        )}
      />
    </Providers>,
  );
  return { gps, bodies };
}
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));
afterEach(() => vi.useRealTimers());
it('opens history on the Merida civil date after UTC midnight', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-14T01:00:00Z'));
  await mount();
  expect(await screen.findByLabelText('Desde')).toHaveValue('2026-11-13');
  expect(screen.getByLabelText('Hasta')).toHaveValue('2026-11-13');
});
it('identifies each incident by employee and the civil date of its shift', async () => {
  await mount({
    incidentsPage: true,
    history: [
      { ...slot, incidents: [incident] },
      {
        ...slot,
        assignmentId: '5ff93c1e-33a0-4f04-b5d1-503f339d0c62',
        employeeName: 'Luis López',
        workDate: '2026-11-11',
        incidents: [
          { ...incident, id: '5ff93c1e-33a0-4f04-b5d1-503f339d0c63' },
        ],
      },
    ],
  });
  expect(await screen.findByText('Ana Pérez · 2026-11-12')).toBeVisible();
  expect(screen.getByText('Luis López · 2026-11-11')).toBeVisible();
  expect(
    screen.getAllByText('Se requiere ubicación · Pendiente de revisión'),
  ).toHaveLength(2);
});
it('requires an explicit published slot and home office never requests GPS or sends device time', async () => {
  const { gps, bodies } = await mount();
  const entry = await screen.findByRole('button', {
    name: 'Registrar entrada',
  });
  expect(entry).toBeDisabled();
  await userEvent.selectOptions(screen.getByLabelText('Turno publicado'), id);
  await userEvent.click(entry);
  expect(await screen.findByText('Entrada registrada')).toBeVisible();
  expect(screen.getByText('Hora confirmada por el servidor')).toBeVisible();
  expect(screen.getByText('Marcaje aceptado', { exact: true })).toBeVisible();
  expect(gps).not.toHaveBeenCalled();
  expect(bodies[0]).toEqual({
    assignmentId: id,
    direction: 'ENTRY',
    idempotencyKey: expect.any(String),
  });
});
it('keeps the exact idempotent payload after unknown network result', async () => {
  const { bodies } = await mount({ unknown: true });
  await userEvent.selectOptions(
    await screen.findByLabelText('Turno publicado'),
    id,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Registrar entrada' }),
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Reintentar mismo intento' }),
  );
  await waitFor(() => expect(bodies).toHaveLength(2));
  expect(bodies[1]).toEqual(bodies[0]);
});
it('conserva un intento desconocido al cancelar navegación', async () => {
  const { bodies } = await mount({ unknown: true });
  await userEvent.selectOptions(
    await screen.findByLabelText('Turno publicado'),
    id,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Registrar entrada' }),
  );
  await screen.findByRole('button', { name: 'Reintentar mismo intento' });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await userEvent.click(screen.getByRole('link', { name: 'Ver calendario' }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(
    screen.getByRole('button', { name: 'Reintentar mismo intento' }),
  ).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Reintentar mismo intento' }),
  );
  await waitFor(() => expect(bodies).toHaveLength(2));
  expect(bodies[1]).toEqual(bodies[0]);
  confirm.mockRestore();
});
it('conserva el motivo sin guardar al cancelar un cambio de rango', async () => {
  await mount({
    incidentsPage: true,
    history: [{ ...slot, incidents: [incident] }],
  });
  const reason = await screen.findByLabelText('Motivo');
  await userEvent.type(reason, 'Borrador de justificación');
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await userEvent.clear(screen.getByLabelText('Desde'));
  await userEvent.type(screen.getByLabelText('Desde'), '2026-11-12');
  await userEvent.clear(screen.getByLabelText('Hasta'));
  await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-13');
  await userEvent.click(screen.getByRole('button', { name: 'Consultar' }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('Motivo')).toHaveValue(
    'Borrador de justificación',
  );
  confirm.mockRestore();
});
it('does not offer punches for an account without an employee', async () => {
  await mount({ linked: false });
  expect(
    await screen.findByText('Tu cuenta no tiene un empleado activo vinculado.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Registrar entrada' }),
  ).not.toBeInTheDocument();
});

it('preserves denied GPS as a server attempt and blocks the next punch for a required reason', async () => {
  const { gps, bodies } = await mount({ onsite: true, incident: true });
  await userEvent.selectOptions(
    await screen.findByLabelText('Turno publicado'),
    id,
  );
  expect(gps).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Registrar entrada' }),
  );
  expect(await screen.findByText('Motivo requerido')).toBeVisible();
  expect(gps).toHaveBeenCalledTimes(1);
  expect(bodies[0]).toEqual({
    assignmentId: id,
    direction: 'ENTRY',
    idempotencyKey: expect.any(String),
  });
  expect(
    screen.getByRole('button', { name: 'Registrar salida' }),
  ).toBeDisabled();
  expect(screen.getByLabelText('Motivo')).toBeVisible();
});

it('shows a server conflict and preserves the selected slot', async () => {
  await mount({ conflict: true });
  await userEvent.selectOptions(
    await screen.findByLabelText('Turno publicado'),
    id,
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Registrar entrada' }),
  );
  expect(await screen.findByText('Este marcaje ya existe.')).toBeVisible();
  expect(screen.getByLabelText('Turno publicado')).toHaveValue(id);
  expect(
    screen.queryByRole('button', { name: 'Reintentar mismo intento' }),
  ).not.toBeInTheDocument();
});
it('rejects civil report ranges over 93 days without querying that range', async () => {
  await mount();
  const from = await screen.findByLabelText('Desde');
  await userEvent.clear(from);
  await userEvent.type(from, '2026-01-01');
  const to = screen.getByLabelText('Hasta');
  await userEvent.clear(to);
  await userEvent.type(to, '2026-12-31');
  await userEvent.click(screen.getByRole('button', { name: 'Consultar' }));
  expect(
    await screen.findByText('Selecciona un período de 1 a 93 días.'),
  ).toBeVisible();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes('from=2026-01-01')),
  ).toBe(false);
});
