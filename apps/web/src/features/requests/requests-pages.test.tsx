import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { createAppRouter } from '@/app/router';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const at = '2026-11-13T14:00:00.000Z';
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
  departmentIds: [id],
  managedDepartmentIds: [],
  permissions: {
    manageUsers: false,
    manageOrganization: false,
    viewAllEmployees: false,
  },
};
const policy = {
  id,
  version: 1,
  name: 'Política empresa',
  entitlements: [{ fromYear: 1, days: 12 }],
  administrativeWeekdays: [1, 2, 3, 4, 5],
  operationalWeekdays: [1, 2, 3, 4, 5, 6, 7],
  excludeHolidays: true,
  createdAt: at,
};
const permission = {
  id,
  version: 1,
  name: 'Consulta médica',
  paid: true,
  evidenceRequired: true,
  allowPartial: true,
  active: true,
};
const balance = {
  employeeId: id,
  employeeName: 'Ana Pérez',
  anniversaryYear: 1,
  entitlement: 12,
  balance: 12,
  reserved: 2,
  available: 10,
  approvedDays: 0,
  enjoyedDays: 0,
  movements: [],
};
const leave = {
  id,
  kind: 'VACATION',
  status: 'PENDING_HEAD',
  approvalFlow: 'HEAD_ONLY',
  employeeId: id,
  employeeName: 'Ana Pérez',
  departmentId: id,
  reason: 'Descanso familiar',
  fromDate: '2027-01-11',
  toDate: '2027-01-12',
  partialStartsAt: null,
  partialEndsAt: null,
  vacationPeriodYear: 1,
  days: 2,
  chargedDates: ['2027-01-11', '2027-01-12'],
  permissionTypeId: null,
  permissionTypeName: null,
  paid: true,
  incidentId: null,
  originalRequestId: null,
  policyVersion: 1,
  createdAt: at,
  resolvedAt: null,
  decisions: [],
  evidence: [],
  canHeadDecide: false,
  canDirectorDecide: false,
  canWithdraw: true,
  canCancel: false,
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
function mount(
  page: 'requests' | 'approvals' | 'vacation' | 'policies',
  options: {
    unlinked?: boolean;
    manager?: boolean;
    unknown?: boolean;
    rejected?: 403 | 409;
    eligible?: boolean;
    withdrawn?: boolean;
    legacy?: boolean;
    hourly?: boolean;
    team?: boolean;
    path?: string;
    balanceWait?: Promise<void>;
    empty?: boolean;
  } = {},
) {
  const writes: {
    url: string;
    body: Record<string, unknown>;
    csrf: string | null;
  }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/auth/session')
        return json({
          ...session,
          employeeId: options.unlinked ? null : id,
          user: {
            ...session.user,
            roles: options.manager ? ['ADMIN'] : ['EMPLOYEE'],
          },
          permissions: {
            ...session.permissions,
            manageOrganization: !!options.manager,
            manageUsers: !!options.manager,
          },
        });
      if (init?.method && init.method !== 'GET') {
        writes.push({
          url,
          body: JSON.parse(String(init.body)),
          csrf: new Headers(init.headers).get('x-csrf-token'),
        });
        if (options.unknown) throw new TypeError('network');
        if (options.rejected)
          return json(
            {
              error: {
                code: options.rejected === 403 ? 'FORBIDDEN' : 'CONFLICT',
                message: `Solicitud rechazada por el servidor (${options.rejected}).`,
                requestId: id,
              },
            },
            options.rejected,
          );
        return json(leave);
      }
      if (url === '/api/leave/configuration')
        return json({
          policy,
          permissionTypes: [
            {
              ...permission,
              minimumNoticeHours: options.hourly ? 24 : 0,
              partialOnly: !!options.hourly,
              ...(options.hourly ? { evidenceRequired: false } : {}),
            },
          ],
        });
      if (url === '/api/requests')
        return json({
          items: options.empty
            ? []
            : [
                {
                  ...leave,
                  approvalFlow: options.legacy ? 'HEAD_DIRECTOR' : 'HEAD_ONLY',
                  canHeadDecide: !!options.eligible,
                  ...(options.withdrawn
                    ? {
                        status: 'WITHDRAWN',
                        canWithdraw: false,
                        withdrawal: {
                          reason: 'Cambio de planes',
                          actorId: id,
                          createdAt: at,
                        },
                      }
                    : {}),
                },
              ],
        });
      if (url === '/api/vacation/balances') {
        await options.balanceWait;
        return json({
          items: [
            balance,
            ...(options.team
              ? [
                  {
                    ...balance,
                    employeeId: '5ff93c1e-33a0-4f04-b5d1-503f339d0c62',
                    employeeName: 'Luis del equipo',
                    balance: 9,
                    reserved: 0,
                    available: 9,
                  },
                ]
              : []),
          ],
        });
      }
      if (url === '/api/employees') return json({ items: [] });
      return json({ items: [] });
    }),
  );
  const paths = {
    requests: '/solicitudes',
    approvals: '/aprobaciones',
    vacation: '/vacaciones',
    policies: '/politicas-ausencias',
  };
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [options.path ?? paths[page]] }),
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return writes;
}
async function reviewAndSend() {
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar solicitud' }),
  );
  await screen.findByRole('heading', { name: 'Revisa tu solicitud' });
  await userEvent.click(
    screen.getByRole('button', { name: 'Enviar solicitud' }),
  );
}
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));
it('explains an empty personal history and offers a first draft without sending it', async () => {
  const writes = mount('requests', { empty: true });
  expect(
    await screen.findByText('Todavía no tienes solicitudes'),
  ).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Crear mi primera solicitud' }),
  );
  expect(
    await screen.findByRole('dialog', { name: 'Nueva solicitud' }),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
});
it('separates personal vacation days from team management without mixing employees', async () => {
  mount('vacation', { manager: true, team: true });
  expect(
    await screen.findByRole('button', { name: 'Mis días' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    await screen.findByText('Ana Pérez · Año de servicio 1'),
  ).toBeVisible();
  expect(
    screen.queryByText('Luis del equipo · Año de servicio 1'),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Equipo' }));
  expect(
    await screen.findByText('Luis del equipo · Año de servicio 1'),
  ).toBeVisible();
  await userEvent.selectOptions(
    screen.getByLabelText('Filtrar por empleado'),
    '5ff93c1e-33a0-4f04-b5d1-503f339d0c62',
  );
  expect(
    screen.queryByText('Ana Pérez · Año de servicio 1'),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Luis del equipo · Año de servicio 1')).toBeVisible();
});
it('keeps a cold-link period selected after delayed data and permits reverting the draft', async () => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount('requests', {
    path: '/solicitudes?create=VACATION&period=1',
    balanceWait: waiting,
  });
  await screen.findByRole('dialog', { name: 'Nueva solicitud' });
  release();
  await waitFor(() =>
    expect(screen.getByLabelText('Período de vacaciones')).toHaveValue('1'),
  );
  const reason = screen.getByLabelText('Motivo de la solicitud');
  await userEvent.type(reason, 'Temporal');
  await userEvent.clear(reason);
  const discard = vi.spyOn(window, 'confirm').mockReturnValue(false);
  try {
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(discard).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  } finally {
    discard.mockRestore();
  }
});
it('opens a vacation from its available period and reviews it before any write', async () => {
  const writes = mount('vacation');
  await userEvent.click(
    await screen.findByRole('link', {
      name: 'Solicitar vacaciones del año 1',
    }),
  );
  expect(
    await screen.findByRole('dialog', { name: 'Nueva solicitud' }),
  ).toBeVisible();
  expect(await screen.findByLabelText('Período de vacaciones')).toHaveValue(
    '1',
  );
  await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
  await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-12');
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Descanso para revisar',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar solicitud' }),
  );
  expect(
    await screen.findByRole('heading', {
      name: 'Revisa tu solicitud',
    }),
  ).toBeVisible();
  expect(screen.getByText('Descanso para revisar')).toBeVisible();
  expect(writes).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
  expect(screen.getByLabelText('Motivo de la solicitud')).toHaveValue(
    'Descanso para revisar',
  );
  expect(screen.getByLabelText('Período de vacaciones')).toHaveValue('1');
  const discard = vi.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    await userEvent.click(
      screen.getByRole('button', { name: 'Volver al listado' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Solicitudes' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  } finally {
    discard.mockRestore();
  }
});
it('does not impose notice on an unrelated new generic permission type', async () => {
  const writes = mount('policies', { manager: true });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nuevo tipo de permiso' }),
  );
  const field = await screen.findByLabelText('Nombre del tipo de permiso');
  await userEvent.type(field, 'Permiso especial');
  expect(screen.getByLabelText('Anticipación mínima (horas)')).toHaveValue(0);
  await userEvent.click(
    screen.getByRole('button', { name: 'Guardar tipo de permiso' }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]!.body).toMatchObject({
    minimumNoticeHours: 0,
    partialOnly: false,
  });
});
it('does not show the previous success as confirmation of a new unsent draft', async () => {
  mount('requests');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
  await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-12');
  await userEvent.selectOptions(
    screen.getByLabelText('Período de vacaciones'),
    '1',
  );
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Primera solicitud',
  );
  await reviewAndSend();
  expect(
    await screen.findByText(
      'Solicitud enviada. Puedes seguir su estado en Mis solicitudes.',
    ),
  ).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Nueva solicitud' }),
  );
  expect(screen.queryByText(/Solicitud enviada/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Motivo de la solicitud')).toHaveValue('');
});
it('does not carry permission conditions into a vacation review after switching type', async () => {
  mount('requests');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  await userEvent.selectOptions(
    screen.getByLabelText('Tipo de solicitud'),
    'PERMISSION',
  );
  await userEvent.selectOptions(screen.getByLabelText('Tipo de permiso'), id);
  await userEvent.selectOptions(
    screen.getByLabelText('Tipo de solicitud'),
    'VACATION',
  );
  await userEvent.selectOptions(
    screen.getByLabelText('Período de vacaciones'),
    '1',
  );
  await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
  await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-12');
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Ahora son vacaciones',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar solicitud' }),
  );
  const review = await screen.findByRole('region', {
    name: 'Revisa tu solicitud',
  });
  expect(within(review).queryByText(/Consulta médica/)).not.toBeInTheDocument();
  expect(within(review).getByText('Vacaciones')).toBeVisible();
});
it('shows mandatory hourly dates and notice without requesting a receipt', async () => {
  mount('requests', { hourly: true });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  await screen.findByRole('button', { name: 'Revisar solicitud' });
  await userEvent.selectOptions(
    screen.getByLabelText('Tipo de solicitud'),
    'PERMISSION',
  );
  await userEvent.selectOptions(screen.getByLabelText('Tipo de permiso'), id);
  expect(
    await screen.findByText(
      'Solicita este permiso al menos 24 horas antes del inicio de la ausencia.',
    ),
  ).toBeVisible();
  expect(screen.getByLabelText('Inicio parcial')).toBeRequired();
  expect(screen.getByLabelText('Fin parcial')).toBeRequired();
  expect(
    screen.getByLabelText('Solicitar solo parte de la jornada'),
  ).toBeChecked();
  expect(
    screen.getByLabelText('Solicitar solo parte de la jornada'),
  ).toBeDisabled();
  expect(
    screen.getByText('Basta indicar el motivo; no se requiere comprobante.'),
  ).toBeVisible();
});
it('lets managers change pay and preserve the hourly notice requirements', async () => {
  const writes = mount('policies', { manager: true, hourly: true });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Editar Consulta médica' }),
  );
  expect(screen.getByLabelText('Con goce de sueldo')).toBeChecked();
  expect(screen.getByLabelText('Anticipación mínima (horas)')).toHaveValue(24);
  expect(screen.getByLabelText('Exigir intervalo por horas')).toBeChecked();
  await userEvent.click(screen.getByLabelText('Con goce de sueldo'));
  await userEvent.click(
    screen.getByRole('button', { name: 'Guardar tipo de permiso' }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]!.body).toMatchObject({
    paid: false,
    minimumNoticeHours: 24,
    partialOnly: true,
  });
});
it('does not offer requests for an account without a linked employee', async () => {
  mount('requests', { unlinked: true });
  expect(
    await screen.findByRole('heading', {
      name: 'Primero vincula tu cuenta a un empleado',
    }),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Enviar solicitud' }),
  ).not.toBeInTheDocument();
});
it('keeps the same vacation payload and UUID after an unknown response', async () => {
  const writes = mount('requests', { unknown: true });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  await screen.findByRole('button', { name: 'Revisar solicitud' });
  await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
  await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-12');
  await userEvent.selectOptions(
    screen.getByLabelText('Período de vacaciones'),
    '1',
  );
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Descanso familiar',
  );
  await reviewAndSend();
  expect(await screen.findByText(/Resultado desconocido/)).toBeVisible();
  expect(
    screen.queryByText(/Todavía no se ha enviado/),
  ).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', {
      name: 'Reintentar el mismo envío',
    }),
  );
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes[0]).toEqual(writes[1]);
  expect(writes[0]!.body).toMatchObject({
    kind: 'VACATION',
    fromDate: '2027-01-11',
    toDate: '2027-01-12',
    vacationPeriodYear: 1,
    reason: 'Descanso familiar',
    idempotencyKey: expect.any(String),
  });
  expect(writes[0]!.csrf).toBe('csrf');
});
it('uses server eligibility for approval actions instead of the ADMIN role', async () => {
  mount('approvals', { manager: true });
  expect(
    await screen.findByText('No tienes solicitudes pendientes de tu decisión.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Autorizar' }),
  ).not.toBeInTheDocument();
});
it('requires a decision reason and submits only the eligible stage', async () => {
  const writes = mount('approvals', { eligible: true });
  const approve = await screen.findByRole('button', {
    name: 'Autorizar',
  });
  await userEvent.type(
    screen.getByLabelText('Motivo de la decisión'),
    'Cumple política',
  );
  await userEvent.click(approve);
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]!.url).toBe(`/api/requests/${id}/decision`);
  expect(
    await screen.findByText('Solicitud aprobada definitivamente por jefatura.'),
  ).toBeVisible();
  expect(writes[0]!.body).toMatchObject({
    decision: 'APPROVE',
    reason: 'Cumple política',
    idempotencyKey: expect.any(String),
  });
});
it('shows available days separately from the reserved balance and history', async () => {
  mount('vacation');
  expect(
    await screen.findByText('Ana Pérez · Año de servicio 1'),
  ).toBeVisible();
  expect(
    screen.getByText('Disponibles para solicitar').parentElement,
  ).toHaveTextContent('10 días');
  expect(screen.getByText('En revisión').parentElement).toHaveTextContent(
    '2 días',
  );
  expect(
    screen.queryByRole('button', { name: 'Asignar días' }),
  ).not.toBeInTheDocument();
});
it('restricts policy editing to organization management', async () => {
  mount('policies');
  expect(
    await screen.findByText('No tienes permiso para acceder a esta sección.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', {
      name: 'Guardar nueva versión',
    }),
  ).not.toBeInTheDocument();
});
it('requires the configured permission evidence before any request is sent', async () => {
  const writes = mount('requests');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  await userEvent.selectOptions(
    await screen.findByLabelText('Tipo de solicitud'),
    'PERMISSION',
  );
  await userEvent.selectOptions(screen.getByLabelText('Tipo de permiso'), id);
  await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
  await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-11');
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Consulta de seguimiento',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar solicitud' }),
  );
  expect(
    await screen.findByText('Este tipo de permiso requiere una evidencia.'),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
});
it('sends private evidence in the permission payload without a public URL', async () => {
  const writes = mount('requests');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  await userEvent.selectOptions(
    await screen.findByLabelText('Tipo de solicitud'),
    'PERMISSION',
  );
  await userEvent.selectOptions(screen.getByLabelText('Tipo de permiso'), id);
  await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
  await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-11');
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Consulta de seguimiento',
  );
  await userEvent.upload(
    screen.getByLabelText('Evidencias (obligatorias)'),
    new File(['%PDF-1.7\nprivate'], 'constancia.pdf', {
      type: 'application/pdf',
    }),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar solicitud' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Revisa tu solicitud' }),
  ).toHaveFocus();
  expect(
    within(
      screen.getByRole('region', { name: 'Revisa tu solicitud' }),
    ).getByText('constancia.pdf'),
  ).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
  expect(screen.getByLabelText('Tipo de solicitud')).toHaveFocus();
  expect(
    (screen.getByLabelText('Evidencias (obligatorias)') as HTMLInputElement)
      .files?.[0]?.name,
  ).toBe('constancia.pdf');
  await reviewAndSend();
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]!.body).toMatchObject({
    kind: 'PERMISSION',
    permissionTypeId: id,
    evidence: [
      {
        filename: 'constancia.pdf',
        mimeType: 'application/pdf',
        contentBase64: btoa('%PDF-1.7\nprivate'),
      },
    ],
  });
});
it('withdraws an own pending request with a reason and an idempotent command', async () => {
  const writes = mount('requests');
  await userEvent.type(
    await screen.findByLabelText('Motivo del retiro o cancelación'),
    'Cambio de fechas',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Retirar solicitud' }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]!.url).toBe(`/api/requests/${id}/withdraw`);
  expect(writes[0]!.body).toMatchObject({
    reason: 'Cambio de fechas',
    idempotencyKey: expect.any(String),
  });
});
it('does not silently discard extra content in a vacation entitlement rule', async () => {
  const writes = mount('policies', { manager: true });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Editar política' }),
  );
  const field = await screen.findByLabelText('Días por antigüedad');
  await userEvent.clear(field);
  await userEvent.type(field, '1:12:unexpected');
  await userEvent.click(
    screen.getByRole('button', { name: 'Guardar nueva versión' }),
  );
  expect(
    await screen.findByText(
      'Indica una tabla válida y al menos un día laborable para cada categoría.',
    ),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
});
it('retains the withdrawal reason when reopening request history', async () => {
  mount('requests', { withdrawn: true });
  expect(
    await screen.findByText('Motivo del retiro: Cambio de planes'),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Retirar solicitud' }),
  ).not.toBeInTheDocument();
});

it('identifies definitive head approval for new requests without promising CEO signoff', async () => {
  mount('requests');
  expect(
    await screen.findByText('Resolución definitiva de jefatura'),
  ).toBeVisible();
  expect(
    screen.getByText(/La aprobación de jefatura es definitiva/),
  ).toBeVisible();
});
it('preserves the visible historical flow of older requests', async () => {
  mount('approvals', { legacy: true });
  expect(
    await screen.findByText('Flujo histórico: jefatura y dirección'),
  ).toBeVisible();
  expect(
    screen.queryByText('Resolución definitiva de jefatura'),
  ).not.toBeInTheDocument();
});

it('keeps request creation contextual and asks before discarding a draft', async () => {
  mount('requests');
  await screen.findByText('Mis solicitudes');
  expect(screen.queryByLabelText('Tipo de solicitud')).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', { name: 'Nueva solicitud' }),
  );
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Borrador privado',
  );
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(screen.getByLabelText('Motivo de la solicitud')).toHaveValue(
    'Borrador privado',
  );
  expect(confirm).toHaveBeenCalled();
  confirm.mockReturnValue(true);
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  await waitFor(() =>
    expect(
      screen.queryByLabelText('Motivo de la solicitud'),
    ).not.toBeInTheDocument(),
  );
  confirm.mockRestore();
});
it('keeps a saved draft locked and intact until refreshed data arrives', async () => {
  const writes = mount('requests');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
  await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-12');
  await userEvent.selectOptions(
    screen.getByLabelText('Período de vacaciones'),
    '1',
  );
  await userEvent.type(
    screen.getByLabelText('Motivo de la solicitud'),
    'Conservar hasta refrescar',
  );
  const original = vi.mocked(fetch).getMockImplementation()!;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.mocked(fetch).mockImplementation(async (url, init) => {
    if (String(url) === '/api/requests' && init?.method === 'GET') await held;
    return original(url, init);
  });
  await reviewAndSend();
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(screen.getByLabelText('Motivo de la solicitud')).toHaveValue(
    'Conservar hasta refrescar',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Enviar solicitud' }),
  ).toBeDisabled();
  release();
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(
    screen.getByText(
      'Solicitud enviada. Puedes seguir su estado en Mis solicitudes.',
    ),
  ).toBeVisible();
});

it('closes a reverted request draft without asking to discard unchanged values', async () => {
  mount('requests');
  await userEvent.click(
    await screen.findByRole('button', { name: 'Nueva solicitud' }),
  );
  const reason = screen.getByLabelText('Motivo de la solicitud');
  await userEvent.type(reason, 'Temporal');
  await userEvent.clear(reason);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(confirm).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  confirm.mockRestore();
});

it.each([403, 409] as const)(
  'preserves a new request draft after HTTP %s without success or a replacement UUID',
  async (status) => {
    const writes = mount('requests', { rejected: status });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva solicitud' }),
    );
    await userEvent.type(screen.getByLabelText('Desde'), '2027-01-11');
    await userEvent.type(screen.getByLabelText('Hasta'), '2027-01-12');
    await userEvent.selectOptions(
      screen.getByLabelText('Período de vacaciones'),
      '1',
    );
    const reason = screen.getByLabelText('Motivo de la solicitud');
    await userEvent.type(reason, 'Conservar el borrador rechazado');
    const uuid = vi.spyOn(crypto, 'randomUUID').mockReturnValue(id);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      await reviewAndSend();
      const message = `Solicitud rechazada por el servidor (${status}).`;
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(reason).toHaveValue('Conservar el borrador rechazado');
      expect(screen.getByLabelText('Desde')).toHaveValue('2027-01-11');
      expect(screen.getByLabelText('Hasta')).toHaveValue('2027-01-12');
      expect(screen.getByLabelText('Período de vacaciones')).toHaveValue('1');
      expect(screen.queryByText(/Solicitud enviada/)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Resultado desconocido/),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Reintentar el mismo envío' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Enviar solicitud' }),
      ).toBeEnabled();
      await userEvent.click(
        screen.getByRole('button', { name: 'Cerrar panel' }),
      );
      expect(confirm).toHaveBeenCalledOnce();
      expect(screen.getByRole('dialog')).toBeVisible();
      expect(reason).toHaveValue('Conservar el borrador rechazado');
      expect(screen.getByRole('alert')).toHaveTextContent(message);
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatchObject({
        url: '/api/requests',
        csrf: 'csrf',
        body: {
          kind: 'VACATION',
          fromDate: '2027-01-11',
          toDate: '2027-01-12',
          vacationPeriodYear: 1,
          reason: 'Conservar el borrador rechazado',
          idempotencyKey: id,
        },
      });
      expect(uuid).toHaveBeenCalledOnce();
    } finally {
      uuid.mockRestore();
      confirm.mockRestore();
    }
  },
);
