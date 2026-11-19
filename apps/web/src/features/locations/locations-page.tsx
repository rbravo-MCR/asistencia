import { LocationEditor } from './location-editor';
import { MapPin, Navigation, ShieldCheck, Plus } from 'lucide-react';
import { submit, useWrite } from '../planning/use-write';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  LocationListSchema,
  LocationAuthorizationListSchema,
  EmployeeListSchema,
  GeoCheckSchema,
  type SessionView,
  type LocationView,
  type GeoCheckInput,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass, FormError } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { TextField, SelectField, WriteFeedback } from '../planning/controls';
const results: Record<string, string> = {
  VALID: 'Ubicación válida',
  OUTSIDE_GEOFENCE: 'Fuera del radio autorizado',
  ACCURACY_INSUFFICIENT: 'Precisión insuficiente',
  LOCATION_REQUIRED: 'Se requiere ubicación',
  NO_AUTHORIZED_LOCATION: 'Sin centro autorizado vigente',
  NOT_REQUIRED: 'No se requiere GPS para home office',
};
export function LocationsPage() {
  return (
    <ProtectedPage>
      {(session) => <LocationsContent session={session} />}
    </ProtectedPage>
  );
}
function LocationsContent({ session }: { session: SessionView }) {
  const manager = session.permissions.manageOrganization;
  const locations = useQuery({
    queryKey: ['locations'],
    queryFn: ({ signal }) =>
      request('/locations', LocationListSchema, { signal }),
    retry: false,
  });
  const authorizations = useQuery({
    queryKey: ['location-authorizations'],
    queryFn: ({ signal }) =>
      request('/location-authorizations', LocationAuthorizationListSchema, {
        signal,
      }),
    retry: false,
  });
  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: ({ signal }) =>
      request('/employees', EmployeeListSchema, { signal }),
    retry: false,
  });
  const [editing, setEditing] = useState<LocationView | null>(null);
  const [editor, setEditor] = useState<'center' | 'authorization' | null>(null);
  const [confirm, setConfirm] = useState<{
    path: string;
    title: string;
    detail: string;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const write = useWrite(
    session.csrfToken,
    ['locations', 'location-authorizations'],
    () => {
      setEditing(null);
      setEditor(null);
      setConfirm(null);
    },
  );
  const check = useMutation({
    mutationFn: (body: GeoCheckInput) =>
      request('/locations/validate', GeoCheckSchema, {
        method: 'POST',
        csrfToken: session.csrfToken,
        body,
      }),
    retry: false,
  });
  const employee = employees.data?.items.find(
    (e) => e.id === session.employeeId,
  );
  function locate() {
    check.reset();
    if (employee?.category === 'OPERATIONAL') {
      check.mutate({});
      return;
    }
    if (!navigator.geolocation) {
      check.mutate({});
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        check.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        setLocating(false);
        check.mutate({});
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return (
    <Page
      eyebrow="Administración"
      title="Centros de trabajo"
      actions={
        manager ? (
          <div className="flex flex-wrap gap-2">
            <Button
              id="locations-new-center"
              onClick={() => {
                setEditing(null);
                write.reset();
                setEditor('center');
              }}
            >
              <Plus aria-hidden="true" />
              Nuevo centro
            </Button>
            <Button
              id="locations-authorize-center"
              variant="outline"
              onClick={() => {
                write.reset();
                setEditor('authorization');
              }}
            >
              <ShieldCheck aria-hidden="true" />
              Autorizar centro
            </Button>
          </div>
        ) : undefined
      }
      description="Centros, geocercas y autorizaciones de ubicación. La comprobación es puntual y solo se solicita al pulsar el botón."
    >
      <section className={`${panelClass} border-l-4 border-l-primary`}>
        <div className="flex items-center gap-3">
          <Navigation aria-hidden="true" className="size-5 shrink-0" />
          <h2 className="text-xl font-semibold">Comprobar mi ubicación</h2>
        </div>
        <p>
          Esta prueba conserva el resultado de validación. No registra entrada,
          salida ni asistencia. Para marcar tu jornada, abre Asistencia.
        </p>
        <p className="text-sm text-muted-foreground">
          En home office no se requiere GPS. Si se niega el permiso o no hay
          coordenadas, se conserva el intento para revisión.
        </p>
        <Button
          type="button"
          disabled={
            locating || check.isPending || employees.isPending || !employee
          }
          onClick={locate}
        >
          Comprobar mi ubicación
        </Button>
        {!session.employeeId && (
          <p className="text-sm">
            Tu cuenta necesita un expediente vinculado para realizar esta
            prueba.
          </p>
        )}
        {locating && <p role="status">Solicitando ubicación…</p>}
        <FormError message={check.error?.message} />
        {check.isPending && <p role="status">Validando ubicación…</p>}
        {check.data && (
          <div role="status" className="space-y-2 rounded-md bg-secondary p-4">
            <p className="font-semibold">{results[check.data.result]}</p>
            {check.data.distanceMeters !== null && (
              <p>Distancia: {check.data.distanceMeters.toFixed(1)} m</p>
            )}
            <p className="text-xs">
              {new Date(check.data.checkedAt).toLocaleString('es-MX')}
            </p>
          </div>
        )}
        <QueryFeedback query={employees} />
      </section>
      <>
        {manager && !editor && !confirm && <WriteFeedback mutation={write} />}
        {manager && confirm && (
          <LocationEditor
            title={confirm.title}
            initialFocusId="location-confirm-back"
            returnFocusId={
              confirm.path.startsWith('/location-authorizations/')
                ? 'locations-authorize-center'
                : 'locations-new-center'
            }
            pending={write.isPending}
            onClose={() => setConfirm(null)}
          >
            <WriteFeedback mutation={write} />
            <p>
              {confirm.detail} Se conservará el historial y se validarán las
              referencias.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={write.isPending}
                onClick={() =>
                  write.mutate({ path: confirm.path, method: 'DELETE' })
                }
              >
                Confirmar
              </Button>
              <Button
                type="button"
                id="location-confirm-back"
                variant="outline"
                disabled={write.isPending}
                onClick={() => setConfirm(null)}
              >
                Volver
              </Button>
            </div>
          </LocationEditor>
        )}
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <section className={panelClass}>
            <div className="flex items-center gap-3">
              <MapPin aria-hidden="true" className="size-5 shrink-0" />
              <h2 className="text-xl font-semibold">Centros configurados</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Geocercas y precisión permitida para trabajo presencial.
            </p>
            <QueryFeedback
              query={locations}
              empty={locations.data?.items.length === 0}
            />
            <ul className="space-y-4">
              {locations.data?.items.map((l) => (
                <li
                  key={l.id}
                  className="min-w-0 space-y-3 rounded-xl border p-4"
                >
                  <h3 className="break-words font-semibold">
                    {l.name} · {l.active ? 'Activo' : 'Inactivo'}
                  </h3>
                  <p className="break-words text-sm">
                    {l.latitude}, {l.longitude}
                  </p>
                  <p className="text-sm">
                    Radio: {l.radiusMeters} m · Precisión máxima:{' '}
                    {l.maxAccuracyMeters} m
                  </p>
                  {manager && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Editar centro ${l.name}`}
                        onClick={() => {
                          setEditing(l);
                          write.reset();
                          setEditor('center');
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Eliminar centro ${l.name}`}
                        onClick={() => {
                          write.reset();
                          setConfirm({
                            path: `/locations/${l.id}`,
                            title: 'Eliminar centro',
                            detail: `¿Eliminar el centro ${l.name}?`,
                          });
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
          {manager && editor === 'center' && (
            <LocationEditor
              title={editing ? 'Editar centro' : 'Nuevo centro'}
              initialFocusId="name"
              returnFocusId="locations-new-center"
              pending={write.isPending}
              onClose={() => setEditor(null)}
              action={
                <Button
                  type="submit"
                  form="location-center-form"
                  disabled={write.isPending}
                >
                  {write.isPending ? 'Guardando…' : 'Guardar centro'}
                </Button>
              }
            >
              <WriteFeedback mutation={write} />
              <form
                id="location-center-form"
                key={editing?.id ?? 'new'}
                className="space-y-5"
                onSubmit={(e) => {
                  const d = submit(e);
                  if (write.isPending) return;
                  write.mutate({
                    path: `/locations${editing ? `/${editing.id}` : ''}`,
                    method: editing ? 'PUT' : 'POST',
                    body: {
                      name: String(d.get('name')).trim(),
                      latitude: Number(d.get('latitude')),
                      longitude: Number(d.get('longitude')),
                      radiusMeters: Number(d.get('radiusMeters')),
                      maxAccuracyMeters: Number(d.get('maxAccuracyMeters')),
                      active: d.get('active') === 'on',
                    },
                  });
                }}
              >
                <TextField
                  name="name"
                  label="Nombre del centro"
                  value={editing?.name}
                />
                <TextField
                  name="latitude"
                  label="Latitud"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={editing?.latitude}
                />
                <TextField
                  name="longitude"
                  label="Longitud"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={editing?.longitude}
                />
                <TextField
                  name="radiusMeters"
                  label="Radio en metros"
                  type="number"
                  step="any"
                  min={1}
                  value={editing?.radiusMeters ?? 10}
                />
                <TextField
                  name="maxAccuracyMeters"
                  label="Precisión máxima en metros"
                  type="number"
                  step="any"
                  min={1}
                  value={editing?.maxAccuracyMeters ?? 10}
                />
                <label className="flex flex-wrap gap-2">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={editing?.active ?? true}
                  />
                  Activo
                </label>
              </form>
            </LocationEditor>
          )}
          <section className={panelClass}>
            <div className="flex items-center gap-3">
              <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
              <h2 className="text-xl font-semibold">Autorizaciones</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Personas, centros y fechas autorizadas. Las revocaciones conservan
              su historial.
            </p>
            <QueryFeedback
              query={authorizations}
              empty={authorizations.data?.items.length === 0}
            />
            <ul className="space-y-4">
              {authorizations.data?.items.map((a) => (
                <li
                  key={a.id}
                  className="min-w-0 space-y-3 rounded-xl border p-4"
                >
                  <h3 className="break-words font-semibold">
                    {employees.data?.items.find((e) => e.id === a.employeeId)
                      ?.fullName ?? 'Empleado no disponible'}
                  </h3>
                  <p className="break-words">
                    {locations.data?.items.find((l) => l.id === a.locationId)
                      ?.name ?? 'Centro no disponible'}
                  </p>
                  <p className="text-sm">
                    {a.startsOn} — {a.endsOn ?? 'Sin fecha de fin'} (inclusive)
                  </p>
                  {a.revokedAt ? (
                    <p className="text-sm">Revocada</p>
                  ) : manager ? (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Revocar autorización desde ${a.startsOn}`}
                      onClick={() => {
                        write.reset();
                        setConfirm({
                          path: `/location-authorizations/${a.id}`,
                          title: 'Revocar autorización',
                          detail: `¿Revocar la autorización desde ${a.startsOn} de ${employees.data?.items.find((e) => e.id === a.employeeId)?.fullName ?? 'este empleado'}?`,
                        });
                      }}
                    >
                      Revocar
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          {manager && editor === 'authorization' && (
            <LocationEditor
              title="Autorizar centro"
              initialFocusId="authorizedEmployee"
              returnFocusId="locations-authorize-center"
              pending={write.isPending}
              onClose={() => setEditor(null)}
              action={
                <Button
                  type="submit"
                  form="location-authorization-form"
                  disabled={write.isPending}
                >
                  {write.isPending ? 'Guardando…' : 'Guardar autorización'}
                </Button>
              }
            >
              <WriteFeedback mutation={write} />
              <form
                id="location-authorization-form"
                className="space-y-5"
                onSubmit={(e) => {
                  const d = submit(e);
                  if (write.isPending) return;
                  write.mutate({
                    path: '/location-authorizations',
                    body: {
                      employeeId: d.get('authorizedEmployee'),
                      locationId: d.get('authorizedLocation'),
                      startsOn: d.get('startsOn'),
                      endsOn: d.get('endsOn') || null,
                    },
                  });
                }}
              >
                <SelectField
                  name="authorizedEmployee"
                  label="Empleado autorizado"
                >
                  <option value="">Selecciona un empleado</option>
                  {employees.data?.items
                    .filter(
                      (e) =>
                        e.status === 'ACTIVE' &&
                        e.category === 'ADMINISTRATIVE',
                    )
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                </SelectField>
                <SelectField
                  name="authorizedLocation"
                  label="Centro autorizado"
                >
                  <option value="">Selecciona un centro</option>
                  {locations.data?.items
                    .filter((l) => l.active)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </SelectField>
                <TextField name="startsOn" label="Vigente desde" type="date" />
                <TextField
                  name="endsOn"
                  label="Vigente hasta (opcional)"
                  type="date"
                  required={false}
                />
              </form>
            </LocationEditor>
          )}
        </div>
      </>
    </Page>
  );
}
