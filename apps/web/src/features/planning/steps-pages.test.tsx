import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/app/router';
import { Providers } from '@/app/providers';
import type {
  SessionView,
  EmployeeView,
  ShiftTemplateView,
  ScheduleAssignmentView,
} from '@asistencia/contracts';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const employeeId = '6ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const session: SessionView = {
  user: {
    id,
    email: 'admin@example.com',
    name: 'Administración',
    roles: ['ADMIN'],
    active: true,
    createdAt: '2026-11-12T15:00:00.000Z',
  },
  csrfToken: 'csrf-test',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  employeeId: null,
  departmentIds: [],
  managedDepartmentIds: [],
  permissions: {
    manageUsers: true,
    manageOrganization: true,
    viewAllEmployees: true,
  },
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}
const employee: EmployeeView = {
  id: employeeId,
  employeeNumber: 'E1',
  fullName: 'José Pérez',
  phoneNumber: null,
  address: null,
  departmentId: id,
  position: 'Analista',
  joinedOn: '2026-11-01',
  category: 'ADMINISTRATIVE',
  status: 'ACTIVE',
  supervisorId: null,
  userId: null,
  createdAt: '2026-11-12T15:00:00.000Z',
  updatedAt: '2026-11-12T15:00:00.000Z',
};
const template: ShiftTemplateView = {
  id,
  name: 'Administrativo',
  category: 'ADMINISTRATIVE',
  modality: 'ONSITE',
  startTime: '08:00',
  endTime: '17:00',
  weekdays: [1, 2, 3, 4, 5],
  timeZone: 'America/Merida',
  active: true,
  version: 1,
};
const location = {
  id,
  name: 'Centro autorizado',
  latitude: 20.97,
  longitude: -89.62,
  radiusMeters: 100,
  maxAccuracyMeters: 50,
  active: true,
  createdAt: '2026-11-12T15:00:00.000Z',
  updatedAt: '2026-11-12T15:00:00.000Z',
};
const authorization = {
  id,
  employeeId,
  locationId: id,
  startsOn: '2026-11-01',
  endsOn: '2026-11-20',
  revokedAt: null,
  createdAt: '2026-11-12T15:00:00.000Z',
  createdBy: id,
};
type Handler = (
  url: string,
  init?: RequestInit,
) => Response | undefined | Promise<Response | undefined>;

async function mount(
  path: string,
  manager = true,
  handler?: Handler,
  linked = false,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const result = await handler?.(url, init);
      if (result) return result;
      if (url === '/api/auth/session')
        return json({
          ...session,
          user: {
            ...session.user,
            roles: manager ? session.user.roles : ['EMPLOYEE'],
          },
          employeeId: linked ? employeeId : null,
          permissions: {
            ...session.permissions,
            manageUsers: manager,
            manageOrganization: manager,
            viewAllEmployees: manager,
          },
        });
      if (url === '/api/notifications')
        return json({ items: [], unreadCount: 0 });
      if (url.startsWith('/api/audit-events'))
        return json({ items: [], total: 0 });
      return json({ items: [] });
    }),
  );
  render(
    <Providers>
      <RouterProvider
        router={createAppRouter(
          createMemoryHistory({ initialEntries: [path] }),
        )}
      />
    </Providers>,
  );
  return vi.mocked(fetch);
}
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));
describe('etapas 10–12', () => {
  it.each([
    ['/auditoria', 'Auditoría'],
    ['/avisos', 'Avisos'],
    ['/calendario', 'Asignar turnos'],
    ['/turnos', 'Plantillas de turno'],
    ['/ubicaciones', 'Centros de trabajo'],
  ])('abre %s', async (path, title) => {
    await mount(path);
    expect(await screen.findByRole('heading', { name: title })).toBeVisible();
  });
  it('impide consultar auditoría sin permiso', async () => {
    await mount('/auditoria', false);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso',
    );
  });
  it('no solicita GPS al abrir ubicaciones', async () => {
    const gps = vi.fn();
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: gps },
    });
    await mount('/ubicaciones', false);
    expect(
      await screen.findByRole('button', { name: 'Comprobar mi ubicación' }),
    ).toBeVisible();
    expect(gps).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Guardar centro' }),
    ).not.toBeInTheDocument();
  });
});

describe('asignación comprensible de turnos', () => {
  it('permite ir de plantillas a asignaciones sin crear un turno', async () => {
    const fetch = await mount('/turnos');
    await screen.findByRole('heading', { name: 'Plantillas de turno' });
    await userEvent.click(
      await within(await screen.findByRole('main')).findByRole('link', {
        name: 'Asignar turnos',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Asignar turnos' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Asignar turno' })).toBeVisible();
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === 'POST'),
    ).toHaveLength(0);
  });
  it('muestra la plantilla elegida y actualiza persona y fecha antes de guardar el borrador', async () => {
    const fetch = await mount('/calendario', true, (url) => {
      if (url === '/api/employees') return json({ items: [employee] });
      if (url === '/api/shift-templates')
        return json({
          items: [
            template,
            {
              ...template,
              id: employeeId,
              name: 'Noche remota',
              category: 'ADMINISTRATIVE',
              modality: 'HOME_OFFICE',
              startTime: '22:00',
              endTime: '06:00',
            },
          ],
        });
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Asignar turno' }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Empleado del turno'),
      employeeId,
    );
    await userEvent.selectOptions(screen.getByLabelText('Plantilla'), id);
    const summary = screen.getByRole('region', {
      name: 'Resumen de la asignación',
    });
    expect(summary).toHaveTextContent('José Pérez');
    expect(summary).toHaveTextContent('08:00–17:00');
    expect(summary).toHaveTextContent('Administrativo');
    expect(summary).toHaveTextContent('Presencial');
    await userEvent.selectOptions(
      screen.getByLabelText('Plantilla'),
      employeeId,
    );
    await userEvent.clear(screen.getByLabelText('Fecha de inicio'));
    await userEvent.type(
      screen.getByLabelText('Fecha de inicio'),
      '2026-11-20',
    );
    expect(summary).toHaveTextContent('22:00–06:00 (+1 día)');
    expect(summary).toHaveTextContent('Administrativo');
    expect(summary).toHaveTextContent('Home office');
    expect(summary).toHaveTextContent('2026-11-20');
    expect(within(summary).queryByText('08:00–17:00')).not.toBeInTheDocument();
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === 'POST'),
    ).toHaveLength(0);
  });
  it('ofrece solo plantillas de la categoría de la persona y centros autorizados en la fecha inclusiva', async () => {
    await mount('/calendario?from=2026-11-20&to=2026-11-20', true, (url) => {
      if (url === '/api/employees') return json({ items: [employee] });
      if (url === '/api/shift-templates')
        return json({
          items: [
            template,
            {
              ...template,
              id: employeeId,
              name: 'Operación',
              category: 'OPERATIONAL',
            },
          ],
        });
      if (url === '/api/locations')
        return json({
          items: [
            location,
            { ...location, id: employeeId, name: 'Centro sin autorización' },
          ],
        });
      if (url === '/api/location-authorizations')
        return json({ items: [authorization] });
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Asignar turno' }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Empleado del turno'),
      employeeId,
    );
    expect(
      within(screen.getByLabelText('Plantilla')).queryByRole('option', {
        name: 'Operación',
      }),
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Plantilla'), id);
    const center = screen.getByLabelText('Centro para trabajo presencial');
    expect(
      within(center).getByRole('option', { name: 'Centro autorizado' }),
    ).toBeVisible();
    expect(
      within(center).queryByRole('option', { name: 'Centro sin autorización' }),
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(center, id);
    await userEvent.clear(screen.getByLabelText('Fecha de inicio'));
    await userEvent.type(
      screen.getByLabelText('Fecha de inicio'),
      '2026-11-21',
    );
    expect(center).toHaveValue('');
    expect(
      within(center).queryByRole('option', { name: 'Centro autorizado' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar borrador' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('link', {
        name: 'Revisar autorizaciones en Ubicaciones',
      }),
    ).toHaveAttribute('href', '/ubicaciones');
    await userEvent.clear(screen.getByLabelText('Fecha de inicio'));
    await userEvent.type(
      screen.getByLabelText('Fecha de inicio'),
      '2026-11-01',
    );
    expect(
      within(center).getByRole('option', { name: 'Centro autorizado' }),
    ).toBeVisible();
  });
  it('explica la falta de autorización aunque el centro esté activo y evita enviar un borrador presencial', async () => {
    const fetch = await mount(
      '/calendario?from=2026-11-20&to=2026-11-20',
      true,
      (url) => {
        if (url === '/api/employees') return json({ items: [employee] });
        if (url === '/api/shift-templates') return json({ items: [template] });
        if (url === '/api/locations') return json({ items: [location] });
        if (url === '/api/location-authorizations') return json({ items: [] });
      },
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Asignar turno' }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Empleado del turno'),
      employeeId,
    );
    await userEvent.selectOptions(screen.getByLabelText('Plantilla'), id);
    expect(
      screen.getByText(/Esta persona no tiene autorizaciones de centro/),
    ).toBeVisible();
    expect(
      screen.getByRole('link', {
        name: /Revisar autorizaciones en Ubicaciones/,
      }),
    ).toHaveAttribute('target', '_blank');
    expect(
      screen.getByRole('link', {
        name: 'Revisar autorizaciones en Ubicaciones',
      }),
    ).toHaveAttribute('href', '/ubicaciones');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar borrador' }),
    );
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === 'POST'),
    ).toHaveLength(0);
  });
  it('limpia el centro al pasar a home office y guarda el payload remoto permitido', async () => {
    const fetch = await mount(
      '/calendario?from=2026-11-20&to=2026-11-20',
      true,
      (url, init) => {
        if (url === '/api/employees') return json({ items: [employee] });
        if (url === '/api/shift-templates')
          return json({
            items: [
              template,
              {
                ...template,
                id: employeeId,
                name: 'Remoto',
                modality: 'HOME_OFFICE',
              },
            ],
          });
        if (url === '/api/locations') return json({ items: [location] });
        if (url === '/api/location-authorizations')
          return json({ items: [authorization] });
        if (url === '/api/schedule-assignments' && init?.method === 'POST')
          return new Response(null, { status: 204 });
      },
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Asignar turno' }),
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Empleado del turno'),
      employeeId,
    );
    await userEvent.selectOptions(screen.getByLabelText('Plantilla'), id);
    await userEvent.selectOptions(
      screen.getByLabelText('Centro para trabajo presencial'),
      id,
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Plantilla'),
      employeeId,
    );
    expect(
      screen.getByLabelText('Centro para trabajo presencial'),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar borrador' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Asignar turno' }),
      ).not.toBeInTheDocument(),
    );
    const created = fetch.mock.calls.find(
      ([url, init]) =>
        url === '/api/schedule-assignments' && init?.method === 'POST',
    );
    expect(JSON.parse(String(created?.[1]?.body))).toEqual({
      employeeId,
      templateId: employeeId,
      workDate: '2026-11-20',
      kind: 'REGULAR',
      locationId: null,
    });
  });
  it('ofrece consultar horarios sin acciones de gestión al lector', async () => {
    await mount('/calendario', false);
    expect(
      await screen.findByRole('heading', { name: 'Mis horarios' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Asignar turno' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ver plantillas de turno' }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText('No tienes turnos en esta selección.'),
    ).toBeVisible();
  });
});

describe('operaciones persistentes de etapas 10–12', () => {
  it('marca un aviso leído con CSRF y actualiza su estado', async () => {
    let read = false;
    const fetch = await mount('/avisos', true, (url, init) => {
      if (url === '/api/notifications')
        return json({
          items: [
            {
              id,
              title: 'Turno publicado',
              message: 'Revisa tu calendario',
              href: '/calendario',
              createdAt: '2026-11-12T15:00:00.000Z',
              readAt: read ? '2026-11-12T16:00:00.000Z' : null,
            },
          ],
          unreadCount: read ? 0 : 1,
        });
      if (url === `/api/notifications/${id}/read` && init?.method === 'POST') {
        read = true;
        return new Response(null, { status: 204 });
      }
    });
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Marcar leído: Turno publicado',
      }),
    );
    expect(await screen.findByText('0 sin leer')).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      `/api/notifications/${id}/read`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'x-csrf-token': 'csrf-test' },
      }),
    );
  });
  it('conserva el formulario y muestra conflicto del servidor al guardar borrador', async () => {
    const fetch = await mount('/calendario', true, (url, init) => {
      if (url === '/api/employees') return json({ items: [employee] });
      if (url === '/api/shift-templates') return json({ items: [template] });
      if (url === '/api/locations') return json({ items: [location] });
      if (url === '/api/location-authorizations')
        return json({
          items: [{ ...authorization, startsOn: '2020-01-01', endsOn: null }],
        });
      if (url === '/api/schedule-assignments' && init?.method === 'POST')
        return json(
          {
            error: {
              code: 'SCHEDULE_CONFLICT',
              requestId: id,
              message: 'El empleado tiene un turno superpuesto.',
            },
          },
          409,
        );
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Asignar turno' }),
    );
    await screen.findAllByRole('option', { name: 'José Pérez' });
    await userEvent.selectOptions(
      await screen.findByLabelText('Empleado del turno'),
      employeeId,
    );
    await userEvent.selectOptions(screen.getByLabelText('Plantilla'), id);
    await userEvent.selectOptions(
      screen.getByLabelText('Centro para trabajo presencial'),
      id,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar borrador' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'turno superpuesto',
    );
    expect(screen.getByLabelText('Empleado del turno')).toHaveValue(employeeId);
    const created = fetch.mock.calls.find(
      ([url, init]) =>
        url === '/api/schedule-assignments' && init?.method === 'POST',
    );
    expect(JSON.parse(String(created?.[1]?.body))).toEqual({
      employeeId,
      templateId: id,
      workDate: (screen.getByLabelText('Fecha de inicio') as HTMLInputElement)
        .value,
      kind: 'REGULAR',
      locationId: id,
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/schedule-assignments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'csrf-test' }),
      }),
    );
  });
  it('exige confirmar antes de publicar y conserva el error del servidor', async () => {
    const workDate = new Date().toISOString().slice(0, 7) + '-15';
    const assignment: ScheduleAssignmentView = {
      id,
      employeeId,
      templateId: id,
      templateVersion: 1,
      workDate,
      kind: 'REGULAR',
      locationId: id,
      startsAt: workDate + 'T14:00:00.000Z',
      endsAt: workDate + 'T23:00:00.000Z',
      modality: 'ONSITE',
      timeZone: 'America/Merida',
      templateName: template.name,
      status: 'DRAFT',
      publishedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      snapshot: template,
    };
    // Snapshot has no id; published evidence is independent from current template.
    assignment.snapshot = { ...template };
    delete (assignment.snapshot as unknown as Record<string, unknown>).id;
    const fetch = await mount('/calendario', true, (url, init) => {
      if (url.startsWith('/api/schedule-assignments?'))
        return json({ items: [assignment] });
      if (url === '/api/employees') return json({ items: [employee] });
      if (url.endsWith('/publish') && init?.method === 'POST')
        return json(
          {
            error: {
              code: 'SCHEDULE_CONFLICT',
              requestId: id,
              message: 'El empleado tiene un turno superpuesto.',
            },
          },
          409,
        );
    });
    await userEvent.click(
      await screen.findByRole('button', { name: /Publicar turno de/ }),
    );
    expect(
      fetch.mock.calls.some(([url]) => String(url).endsWith('/publish')),
    ).toBe(false);
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar publicación' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'turno superpuesto',
    );
    expect(
      screen.getByRole('button', { name: 'Confirmar publicación' }),
    ).toBeEnabled();
    expect(fetch).toHaveBeenCalledWith(
      `/api/schedule-assignments/${id}/publish`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'x-csrf-token': 'csrf-test' },
      }),
    );
  });
  it('los turnos publicados solo permiten cancelar, conservando snapshot visible', async () => {
    const workDate = new Date().toISOString().slice(0, 7) + '-15';
    const assignment: ScheduleAssignmentView = {
      id,
      employeeId,
      templateId: id,
      templateVersion: 1,
      workDate,
      kind: 'REGULAR',
      locationId: id,
      startsAt: workDate + 'T14:00:00.000Z',
      endsAt: workDate + 'T23:00:00.000Z',
      modality: 'ONSITE',
      timeZone: 'America/Merida',
      templateName: template.name,
      status: 'PUBLISHED',
      publishedAt: workDate + 'T00:00:00.000Z',
      cancelledAt: null,
      cancellationReason: null,
      snapshot: template,
    };
    // Snapshot has no id; published evidence is independent from current template.
    assignment.snapshot = { ...template };
    delete (assignment.snapshot as unknown as Record<string, unknown>).id;
    await mount('/calendario', true, (url) => {
      if (url.startsWith('/api/schedule-assignments?'))
        return json({ items: [assignment] });
      if (url === '/api/employees') return json({ items: [employee] });
    });
    expect(
      await screen.findByText('Publicado · Presencial · v1'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Editar turno de/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Publicar turno de/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cancelar turno de/ }),
    ).toBeVisible();
  });
  it('registra un intento sin coordenadas cuando se niega GPS, bajo demanda', async () => {
    const gps = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1, message: 'Denied' } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: gps },
    });
    const fetch = await mount(
      '/ubicaciones',
      false,
      (url, init) => {
        if (url === '/api/employees') return json({ items: [employee] });
        if (url === '/api/locations/validate' && init?.method === 'POST')
          return json({
            id,
            employeeId,
            result: 'LOCATION_REQUIRED',
            checkedAt: '2026-11-12T15:00:00.000Z',
            distanceMeters: null,
            locationId: null,
          });
      },
      true,
    );
    const button = await screen.findByRole('button', {
      name: 'Comprobar mi ubicación',
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(gps).not.toHaveBeenCalled();
    await userEvent.click(button);
    expect(await screen.findByText('Se requiere ubicación')).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      '/api/locations/validate',
      expect.objectContaining({
        body: '{}',
        headers: expect.objectContaining({ 'x-csrf-token': 'csrf-test' }),
      }),
    );
    expect(
      screen.getByText(/No registra entrada, salida ni asistencia/),
    ).toBeVisible();
  });
  it('home office comprueba sin solicitar GPS', async () => {
    const gps = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: gps },
    });
    await mount(
      '/ubicaciones',
      false,
      (url, init) => {
        if (url === '/api/employees')
          return json({ items: [{ ...employee, category: 'OPERATIONAL' }] });
        if (url === '/api/locations/validate' && init?.method === 'POST')
          return json({
            id,
            employeeId,
            result: 'NOT_REQUIRED',
            checkedAt: '2026-11-12T15:00:00.000Z',
            distanceMeters: null,
            locationId: null,
          });
      },
      true,
    );
    const button = await screen.findByRole('button', {
      name: 'Comprobar mi ubicación',
    });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    expect(
      await screen.findByText('No se requiere GPS para home office'),
    ).toBeVisible();
    expect(gps).not.toHaveBeenCalled();
  });
});

describe('estados de carga y validación', () => {
  it('muestra error de carga y permite reintentar avisos sin inventar registros', async () => {
    let failed = true;
    await mount('/avisos', true, (url) =>
      url === '/api/notifications'
        ? failed
          ? json(
              {
                error: {
                  code: 'UNAVAILABLE',
                  message: 'Temporalmente no disponible',
                  requestId: id,
                },
              },
              503,
            )
          : json({ items: [], unreadCount: 0 })
        : undefined,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar la información',
    );
    failed = false;
    await userEvent.click(
      screen.getByRole('button', { name: 'Reintentar carga' }),
    );
    expect(
      await screen.findByText('No hay registros disponibles en tu alcance.'),
    ).toBeVisible();
  });
  it('mantiene el panel bloqueado hasta terminar el refetch tras guardar', async () => {
    let reload = false;
    let release!: (response: Response) => void;
    const deferred = new Promise<Response>((resolve) => {
      release = resolve;
    });
    await mount('/turnos', true, (url, init) => {
      if (url === '/api/shift-templates' && init?.method === 'POST') {
        reload = true;
        return new Response(null, { status: 204 });
      }
      if (url === '/api/shift-templates' && reload) return deferred;
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva plantilla' }),
    );
    await userEvent.type(screen.getByLabelText('Nombre de plantilla'), 'Noche');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar plantilla' }),
    );
    await waitFor(() => expect(reload).toBe(true));
    expect(screen.getByLabelText('Nombre de plantilla')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(screen.getByLabelText('Nombre de plantilla')).toHaveValue('Noche');
    release(json({ items: [] }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
  it('cierra sin confirmación al revertir texto, selección y checkbox', async () => {
    await mount('/turnos');
    const trigger = await screen.findByRole('button', {
      name: 'Nueva plantilla',
    });
    await userEvent.click(trigger);
    expect(screen.getByLabelText('Nombre de plantilla')).toHaveFocus();
    await userEvent.type(screen.getByLabelText('Nombre de plantilla'), 'Noche');
    await userEvent.clear(screen.getByLabelText('Nombre de plantilla'));
    await userEvent.selectOptions(
      screen.getByLabelText('Modalidad'),
      'HOME_OFFICE',
    );
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), 'ONSITE');
    await userEvent.click(screen.getByLabelText('Activa'));
    await userEvent.click(screen.getByLabelText('Activa'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    confirm.mockRestore();
  });
  it('restaura el foco al alta cuando el disparador de edición desaparece en refetch', async () => {
    let saved = false;
    await mount('/turnos', true, (url, init) => {
      if (url === `/api/shift-templates/${id}` && init?.method === 'PUT') {
        saved = true;
        return new Response(null, { status: 204 });
      }
      if (url === '/api/shift-templates')
        return json({ items: saved ? [] : [template] });
    });
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Editar plantilla Administrativo',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar plantilla' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Nueva plantilla' }),
      ).toHaveFocus(),
    );
  });
  it('protege el borrador al cerrar el editor contextual', async () => {
    await mount('/turnos');
    expect(
      screen.queryByLabelText('Nombre de plantilla'),
    ).not.toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva plantilla' }),
    );
    await userEvent.type(screen.getByLabelText('Nombre de plantilla'), 'Noche');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre de plantilla')).toHaveValue('Noche');
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(
      screen.queryByLabelText('Nombre de plantilla'),
    ).not.toBeInTheDocument();
    confirm.mockRestore();
  });
  it('exige por lo menos un día antes de enviar una plantilla', async () => {
    const fetch = await mount('/turnos');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva plantilla' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Nombre de plantilla'),
      'Jornada',
    );
    for (const checkbox of screen.getAllByRole('checkbox')) {
      if (
        checkbox instanceof HTMLInputElement &&
        checkbox.name === 'weekdays' &&
        checkbox.checked
      )
        await userEvent.click(checkbox);
    }
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar plantilla' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Selecciona al menos un día de trabajo',
    );
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(
      false,
    );
  });
});

describe('centros y autorizaciones de consulta', () => {
  it('muestra los centros y vigencias de una persona sin permisos de gestión, sin acciones de escritura', async () => {
    const fetch = await mount(
      '/ubicaciones',
      false,
      (url) => {
        if (url === '/api/employees') return json({ items: [employee] });
        if (url === '/api/locations')
          return json({
            items: [
              {
                id,
                name: 'Centro Mérida',
                latitude: 21.036,
                longitude: -89.622,
                radiusMeters: 10,
                maxAccuracyMeters: 10,
                active: true,
                createdAt: '2026-11-12T15:00:00.000Z',
                updatedAt: '2026-11-12T15:00:00.000Z',
              },
            ],
          });
        if (url === '/api/location-authorizations')
          return json({
            items: [
              {
                id,
                employeeId,
                locationId: id,
                startsOn: '2026-11-01',
                endsOn: '2026-12-31',
                revokedAt: null,
                createdAt: '2026-11-12T15:00:00.000Z',
                createdBy: id,
              },
            ],
          });
      },
      true,
    );
    expect(
      await screen.findByRole('heading', { name: 'Centro Mérida · Activo' }),
    ).toBeVisible();
    expect(
      await screen.findByText('2026-11-01 — 2026-12-31 (inclusive)'),
    ).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'José Pérez' }),
    ).toBeVisible();
    expect(fetch).toHaveBeenCalledWith('/api/locations', expect.anything());
    expect(fetch).toHaveBeenCalledWith(
      '/api/location-authorizations',
      expect.anything(),
    );
    expect(
      screen.queryByRole('button', {
        name: /Editar centro|Eliminar centro|Revocar autorización|Guardar centro|Guardar autorización/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Autorizar centro' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Nombre del centro'),
    ).not.toBeInTheDocument();
  });
});
