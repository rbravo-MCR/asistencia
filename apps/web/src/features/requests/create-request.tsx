import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AttendanceIncidentListSchema,
  LeaveConfigurationSchema,
  VacationBalanceListSchema,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { RequestKindIntent } from '@/lib/request-intent';
import { Field, FormError, selectClass } from '../identity/form-fields';
import { TextField, SelectField } from '../planning/controls';
import { QueryFeedback } from '../employees/query-feedback';
import { prepareEvidence } from './evidence';
import { civilToday, label, type RequestWrite } from './common';
import { ReasonField, PanelActions } from './controls';
import { RequestReview, type RequestReviewData } from './request-review';
import { RequestAttachments } from './request-attachments';

export function CreateRequest({
  session,
  write,
  preparing,
  setPreparing,
  initialKind = 'VACATION',
  initialPeriod,
  onCreated,
}: {
  session: SessionView;
  preparing: boolean;
  setPreparing: Dispatch<SetStateAction<boolean>>;
  write: RequestWrite;
  initialKind?: RequestKindIntent;
  initialPeriod?: number;
  onCreated: () => void;
}) {
  const config = useQuery({
    queryKey: ['leave-config'],
    queryFn: ({ signal }) =>
      request('/leave/configuration', LeaveConfigurationSchema, { signal }),
    retry: false,
  });
  const balances = useQuery({
    queryKey: ['vacation', 'balances'],
    queryFn: ({ signal }) =>
      request('/vacation/balances', VacationBalanceListSchema, { signal }),
    retry: false,
  });
  const [kind, setKind] = useState<string>(initialKind);
  const [period, setPeriod] = useState(
    initialPeriod ? String(initialPeriod) : '',
  );
  const [review, setReview] = useState<RequestReviewData | null>(null);
  const preparingRef = useRef(false);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const hasReviewed = useRef(false);
  useEffect(() => {
    if (review) {
      hasReviewed.current = true;
      reviewTitle.current?.focus();
    } else if (hasReviewed.current) {
      document.getElementById('requestKind')?.focus();
    }
  }, [review]);
  const [partial, setPartial] = useState(false);
  const [permissionId, setPermissionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const today = civilToday();
  const [incidentRange, setIncidentRange] = useState({
    from: new Date(Date.parse(today) - 92 * 86400000)
      .toISOString()
      .slice(0, 10),
    to: today,
  });
  const incidents = useQuery({
    queryKey: ['attendance', 'requests-incidents', incidentRange],
    queryFn: ({ signal }) =>
      request(
        `/attendance/incidents?${new URLSearchParams(incidentRange)}`,
        AttendanceIncidentListSchema,
        { signal },
      ),
    enabled: kind === 'JUSTIFICATION',
    retry: false,
  });
  const permission = config.data?.permissionTypes.find(
    (p) => p.id === permissionId,
  );
  const ownBalances =
    balances.data?.items.filter((b) => b.employeeId === session.employeeId) ??
    [];
  return (
    <form
      id="leave-request"
      className="mt-4 space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (preparingRef.current || preparing || write.blocked) return;
        const form = e.currentTarget;
        if (review) {
          await write.run('/requests', review.body, {
            message:
              'Solicitud enviada. Puedes seguir su estado en Mis solicitudes.',
            onSuccess: () => {
              form.reset();
              onCreated();
            },
          });
          return;
        }
        preparingRef.current = true;
        const data = new FormData(form);
        setError(null);
        setPreparing(true);
        try {
          const reason = String(data.get('requestReason') ?? '').trim();
          if (!reason) throw new Error('Escribe el motivo de la solicitud.');
          const fileInput = form.elements.namedItem('evidence');
          const files =
            fileInput instanceof HTMLInputElement
              ? Array.from(fileInput.files ?? [])
              : [];
          const evidence = await prepareEvidence(files);
          const body: Record<string, unknown> = {
            kind,
            reason,
            ...(evidence.length ? { evidence } : {}),
          };
          if (kind === 'JUSTIFICATION') {
            body.incidentId = data.get('incidentId');
            if (!body.incidentId)
              throw new Error('Selecciona una incidencia propia.');
          } else {
            const fromDate = String(data.get('fromDate')),
              toDate = String(data.get('toDate'));
            const days =
              (Date.parse(toDate) - Date.parse(fromDate)) / 86400000 + 1;
            if (!Number.isFinite(days) || days < 1 || days > 93)
              throw new Error('Selecciona un período de 1 a 93 días.');
            Object.assign(body, { fromDate, toDate });
            if (kind === 'VACATION') {
              const period = Number(data.get('vacationPeriodYear'));
              if (!period)
                throw new Error(
                  'Necesitas un período de vacaciones concedido con saldo disponible.',
                );
              body.vacationPeriodYear = period;
            } else {
              if (!permission)
                throw new Error('Selecciona un tipo de permiso.');
              body.permissionTypeId = permission.id;
              if (permission.evidenceRequired && !evidence.length)
                throw new Error('Este tipo de permiso requiere una evidencia.');
              if (partial || permission.partialOnly) {
                const start = new Date(String(data.get('partialStartsAt'))),
                  end = new Date(String(data.get('partialEndsAt')));
                if (
                  !Number.isFinite(start.getTime()) ||
                  !Number.isFinite(end.getTime()) ||
                  end <= start
                )
                  throw new Error('Indica un intervalo parcial válido.');
                Object.assign(body, {
                  partialStartsAt: start.toISOString(),
                  partialEndsAt: end.toISOString(),
                });
              }
            }
          }
          const incident = incidents.data?.items.find(
            (item) => item.id === body.incidentId,
          );
          setReview({
            body,
            files: files.map((file) => file.name),
            permissionName:
              kind === 'PERMISSION' ? permission?.name : undefined,
            permissionPaid:
              kind === 'PERMISSION' ? permission?.paid : undefined,
            available: ownBalances.find(
              (item) => item.anniversaryYear === body.vacationPeriodYear,
            )?.available,
            incidentLabel: incident
              ? `${label(incident.kind)} · ${new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Merida', dateStyle: 'medium' }).format(new Date(incident.createdAt))}`
              : undefined,
          });
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo preparar la solicitud.',
          );
        } finally {
          preparingRef.current = false;
          setPreparing(false);
        }
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {review
          ? 'Paso 2 de 2 · Revisar y enviar'
          : 'Paso 1 de 2 · Completar datos'}
      </p>
      {(config.isPending || config.isError) && <QueryFeedback query={config} />}
      <FormError message={error ?? undefined} />
      <fieldset
        hidden={Boolean(review)}
        disabled={write.blocked || preparing}
        className="min-w-0 space-y-5"
      >
        <div className="space-y-2">
          <label htmlFor="requestKind" className="block text-sm font-medium">
            Tipo de solicitud
          </label>
          <select
            id="requestKind"
            name="kind"
            value={kind}
            className="flex h-10 w-full rounded-md border bg-card px-3"
            onChange={(e) => {
              setKind(e.target.value);
              setPartial(false);
              setError(null);
            }}
          >
            <option value="VACATION">Vacaciones</option>
            <option value="PERMISSION">Permiso</option>
            <option value="JUSTIFICATION">Justificación</option>
          </select>
        </div>
        {kind === 'VACATION' && (
          <>
            {(balances.isPending || balances.isError) && (
              <QueryFeedback query={balances} />
            )}
            {!config.data?.policy && config.data && (
              <p role="alert">
                RR. HH. debe configurar una política de vacaciones antes de
                solicitar días.
              </p>
            )}
            <Field id="vacationPeriodYear" label="Período de vacaciones">
              <select
                id="vacationPeriodYear"
                name="vacationPeriodYear"
                className={selectClass}
                required
                value={period}
                data-draft-initial-value={
                  initialPeriod ? String(initialPeriod) : undefined
                }
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="">Selecciona un período</option>
                {ownBalances
                  .filter((b) => b.available > 0)
                  .map((b) => (
                    <option key={b.anniversaryYear} value={b.anniversaryYear}>
                      Año de servicio {b.anniversaryYear} · {b.available} días
                      disponibles
                    </option>
                  ))}
              </select>
            </Field>
            {!ownBalances.some((b) => b.available > 0) && balances.data && (
              <p>
                No tienes períodos con saldo disponible. Solicita a RR. HH.
                revisar tu saldo.
              </p>
            )}
            <p className="text-sm">
              Elige un período con días disponibles. Al enviar se apartarán los
              días laborables que correspondan; la jefatura revisará tu
              solicitud.
            </p>
          </>
        )}
        {kind !== 'JUSTIFICATION' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="fromDate" label="Desde" type="date" />
            <TextField name="toDate" label="Hasta" type="date" />
          </div>
        )}
        {kind === 'PERMISSION' && (
          <>
            <div className="space-y-2">
              <label
                htmlFor="permissionTypeId"
                className="block text-sm font-medium"
              >
                Tipo de permiso
              </label>
              <select
                id="permissionTypeId"
                name="permissionTypeId"
                value={permissionId}
                className="flex h-10 w-full rounded-md border bg-card px-3"
                required
                onChange={(e) => {
                  setPermissionId(e.target.value);
                  setPartial(false);
                }}
              >
                <option value="">Selecciona un tipo</option>
                {config.data?.permissionTypes
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.paid ? 'Con goce' : 'Sin goce'}
                    </option>
                  ))}
              </select>
            </div>
            {permission && (
              <p>
                {permission.evidenceRequired
                  ? 'Este permiso requiere evidencia.'
                  : 'Basta indicar el motivo; no se requiere comprobante.'}
              </p>
            )}
            {permission && permission.minimumNoticeHours > 0 && (
              <p>
                Solicita este permiso al menos {permission.minimumNoticeHours}{' '}
                horas antes del inicio de la ausencia.
              </p>
            )}
            {permission?.allowPartial && (
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={partial || permission.partialOnly}
                  disabled={permission.partialOnly}
                  onChange={(e) => setPartial(e.target.checked)}
                />
                Solicitar solo parte de la jornada
              </label>
            )}
            {(partial || permission?.partialOnly) && (
              <>
                <p className="text-sm">
                  Captura las horas en la zona de este dispositivo:{' '}
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}. El horario
                  se revisa según las fechas de Mérida. Indica el intervalo de
                  ausencia: desde el inicio de jornada hasta tu entrada
                  prevista, o desde tu salida prevista hasta el fin de tu
                  jornada asignada.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    name="partialStartsAt"
                    label="Inicio parcial"
                    type="datetime-local"
                  />
                  <TextField
                    name="partialEndsAt"
                    label="Fin parcial"
                    type="datetime-local"
                  />
                </div>
              </>
            )}
          </>
        )}
        {kind === 'JUSTIFICATION' && (
          <>
            <p>
              La justificación conserva la incidencia y el marcaje original. La
              aprobación definitiva de jefatura resuelve la incidencia.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="incidentFrom">Incidencias desde</label>
                <input
                  id="incidentFrom"
                  type="date"
                  className="block w-full rounded-md border p-2"
                  value={incidentRange.from}
                  onChange={(e) =>
                    setIncidentRange({ ...incidentRange, from: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="incidentTo">Incidencias hasta</label>
                <input
                  id="incidentTo"
                  type="date"
                  className="block w-full rounded-md border p-2"
                  value={incidentRange.to}
                  onChange={(e) =>
                    setIncidentRange({ ...incidentRange, to: e.target.value })
                  }
                />
              </div>
            </div>
            {(incidents.isPending || incidents.isError) && (
              <QueryFeedback query={incidents} />
            )}
            <SelectField name="incidentId" label="Incidencia propia">
              <option value="">Selecciona una incidencia</option>
              {incidents.data?.items
                .filter((i) => i.employeeId === session.employeeId)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {label(i.kind)} ·{' '}
                    {new Intl.DateTimeFormat('es-MX', {
                      timeZone: 'America/Merida',
                      dateStyle: 'medium',
                    }).format(new Date(i.createdAt))}
                  </option>
                ))}
            </SelectField>
          </>
        )}
        <ReasonField name="requestReason" label="Motivo de la solicitud" />
        <RequestAttachments
          required={
            kind === 'PERMISSION' && Boolean(permission?.evidenceRequired)
          }
        />
      </fieldset>
      {review && (
        <RequestReview
          ref={reviewTitle}
          body={review.body}
          files={review.files}
          permissionName={review.permissionName}
          permissionPaid={review.permissionPaid}
          incidentLabel={review.incidentLabel}
          available={review.available}
          status={
            write.unknown
              ? 'unknown'
              : write.pending
                ? write.message
                  ? 'submitted'
                  : 'pending'
                : write.error
                  ? 'rejected'
                  : 'ready'
          }
        />
      )}
      <PanelActions>
        {review && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={write.blocked || preparing}
            onClick={() => setReview(null)}
          >
            Editar datos
          </Button>
        )}
        <Button
          form="leave-request"
          type="submit"
          className="min-h-11"
          disabled={
            write.blocked ||
            preparing ||
            !config.data ||
            (kind === 'VACATION' &&
              (!config.data.policy ||
                !ownBalances.some((b) => b.available > 0)))
          }
        >
          {preparing
            ? 'Preparando archivos…'
            : review
              ? 'Enviar solicitud'
              : 'Revisar solicitud'}
        </Button>
      </PanelActions>
    </form>
  );
}
