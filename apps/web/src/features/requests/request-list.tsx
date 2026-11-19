import { useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import type { LeaveRequestView, SessionView } from '@asistencia/contracts';
import { Button } from '@/components/ui/button';
import {
  StatusBadge,
  type StatusTone,
} from '@/components/patterns/status-badge';
import { useDiscardConfirm } from '@/components/patterns/use-discard-confirm';
import { panelClass, FormError } from '../identity/form-fields';
import { label, instant, type RequestWrite } from './common';
import { ReasonField } from './controls';
import { requestDraftSnapshot } from './draft';

function statusTone(status: LeaveRequestView['status']): StatusTone {
  if (status === 'PENDING_HEAD' || status === 'PENDING_DIRECTOR')
    return 'warning';
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
}

export function RequestList({
  items,
  session,
  write,
  approvals = false,
}: {
  items: LeaveRequestView[];
  session: SessionView;
  write: RequestWrite;
  approvals?: boolean;
}) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <RequestCard
          key={item.id}
          item={item}
          session={session}
          write={write}
          approvals={approvals}
        />
      ))}
    </ul>
  );
}
function RequestCard({
  item,
  session,
  write,
  approvals,
}: {
  item: LeaveRequestView;
  session: SessionView;
  write: RequestWrite;
  approvals: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const baseline = useRef<string | null>(null);
  const discard = useDiscardConfirm();
  useBlocker({
    shouldBlockFn: async () =>
      write.blocked || (dirty && !(await discard.confirm())),
    enableBeforeUnload: dirty || write.blocked,
    disabled: !dirty && !write.blocked,
  });

  return (
    <li
      ref={(node) => {
        if (node && baseline.current === null)
          baseline.current = requestDraftSnapshot(node);
      }}
      className={`${panelClass} min-w-0 break-words`}
      onChangeCapture={(event) => {
        const container = event.currentTarget;
        queueMicrotask(() =>
          setDirty(requestDraftSnapshot(container) !== baseline.current),
        );
      }}
      onResetCapture={() => setDirty(false)}
    >
      {discard.dialog}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label(item.kind)}
          </p>
          <h3 className="text-lg font-semibold">{item.employeeName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.fromDate} – {item.toDate}
          </p>
        </div>
        <StatusBadge
          tone={statusTone(item.status)}
          className="max-w-full"
        >
          {label(item.status)}
        </StatusBadge>
      </div>
      <p className="text-sm text-muted-foreground">
        {item.approvalFlow === 'HEAD_ONLY'
          ? 'Resolución definitiva de jefatura'
          : 'Flujo histórico: jefatura y dirección'}
      </p>
      {item.partialStartsAt && item.partialEndsAt && (
        <p>
          {instant(item.partialStartsAt)} – {instant(item.partialEndsAt)} ·
          America/Merida
        </p>
      )}
      {item.kind === 'VACATION' && (
        <p>
          {item.days} días · Año de servicio {item.vacationPeriodYear} ·
          Política v{item.policyVersion}
        </p>
      )}
      {item.permissionTypeName && (
        <p>
          {item.permissionTypeName} ·{' '}
          {item.paid ? 'Con goce de sueldo' : 'Sin goce de sueldo'}
        </p>
      )}
      <div className="rounded-xl border-l-4 border-primary bg-secondary/50 p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Motivo de la solicitud
        </h4>
        <p className="whitespace-pre-wrap">{item.reason}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Enviada: {instant(item.createdAt)}
      </p>
      {item.withdrawal && (
        <div className="space-y-2 rounded-md border p-3">
          <p>Motivo del retiro: {item.withdrawal.reason}</p>
          <p className="text-sm">
            Retirada: {instant(item.withdrawal.createdAt)}
          </p>
        </div>
      )}
      {item.chargedDates.length > 0 && (
        <details>
          <summary className="cursor-pointer font-medium">
            Días incluidos
          </summary>
          <p>{item.chargedDates.join(', ')}</p>
        </details>
      )}
      {item.evidence.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Evidencias privadas</h4>
          <ul className="space-y-2">
            {item.evidence.map((file) => (
              <li key={file.id}>
                <a
                  className="underline underline-offset-4"
                  href={`/api/requests/${item.id}/evidence/${file.id}`}
                  download={file.filename}
                >
                  {file.filename}
                </a>{' '}
                · {Math.ceil(file.sizeBytes / 1024)} KiB
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-3 border-t pt-4">
        <h4 className="font-semibold">Historial de decisiones</h4>
        {!item.decisions.length && <p>Sin decisiones registradas.</p>}
        <ol className="space-y-3">
          {item.decisions.map((d) => (
            <li key={d.id} className="space-y-1 rounded-xl border p-4">
              <p>
                {label(d.step)} · {label(d.decision)} · {d.actorName}
              </p>
              <p>{d.reason}</p>
              <p className="text-sm">{instant(d.createdAt)}</p>
            </li>
          ))}
        </ol>
      </div>
      <FormError message={error ?? undefined} />
      {approvals && (item.canHeadDecide || item.canDirectorDecide) && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (write.blocked) return;
            const form = e.currentTarget;
            const data = new FormData(form);
            const reason = String(data.get(`decision-${item.id}`) ?? '').trim();
            if (!reason) {
              setError('Escribe el motivo de tu decisión.');
              return;
            }
            setError(null);
            const submitter = (e.nativeEvent as SubmitEvent).submitter;
            const decision =
              submitter instanceof HTMLButtonElement
                ? submitter.value
                : 'APPROVE';
            void write.run(
              `/requests/${item.id}/decision`,
              { decision, reason },
              {
                onSuccess: () => {
                  form.reset();
                  setDirty(false);
                  baseline.current = null;
                },
                message:
                  decision === 'REJECT'
                    ? 'Solicitud rechazada; se conserva su historial.'
                    : item.approvalFlow === 'HEAD_ONLY'
                      ? 'Solicitud aprobada definitivamente por jefatura.'
                      : item.canHeadDecide
                        ? 'Autorización conservada. Falta el visto bueno del director.'
                        : 'Visto bueno conservado; solicitud aprobada.',
              },
            );
          }}
        >
          <fieldset
            disabled={write.blocked}
            className="min-w-0 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <legend className="px-1 text-sm font-semibold">
              {item.canHeadDecide
                ? 'Decisión de jefatura'
                : 'Decisión de dirección'}
            </legend>
            <ReasonField
              name={`decision-${item.id}`}
              label="Motivo de la decisión"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" value="APPROVE" disabled={write.blocked}>
                {item.canHeadDecide ? 'Autorizar' : 'Dar visto bueno'}
              </Button>
              <Button
                type="submit"
                value="REJECT"
                variant="outline"
                disabled={write.blocked}
              >
                Rechazar
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {!approvals &&
        item.employeeId === session.employeeId &&
        (item.canWithdraw || item.canCancel) && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (write.blocked) return;
              const form = e.currentTarget;
              const data = new FormData(form);
              const reason = String(
                data.get(`withdraw-${item.id}`) ?? '',
              ).trim();
              if (!reason) {
                setError('Escribe el motivo.');
                return;
              }
              setError(null);
              void write.run(
                item.canWithdraw
                  ? `/requests/${item.id}/withdraw`
                  : '/requests',
                item.canWithdraw
                  ? { reason }
                  : {
                      kind: 'CANCELLATION',
                      originalRequestId: item.id,
                      reason,
                    },
                {
                  onSuccess: () => {
                    form.reset();
                    setDirty(false);
                    baseline.current = null;
                  },
                  message: item.canWithdraw
                    ? 'Solicitud retirada; la reserva queda liberada.'
                    : 'Cancelación enviada. Requiere la decisión definitiva de jefatura.',
                },
              );
            }}
          >
            <fieldset
              disabled={write.blocked}
              className="min-w-0 space-y-4 border-t pt-4"
            >
              <ReasonField
                name={`withdraw-${item.id}`}
                label="Motivo del retiro o cancelación"
              />
              <Button variant="outline" disabled={write.blocked}>
                {item.canWithdraw
                  ? 'Retirar solicitud'
                  : 'Solicitar cancelación'}
              </Button>
            </fieldset>
          </form>
        )}
    </li>
  );
}
