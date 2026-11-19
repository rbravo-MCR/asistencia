import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Umbrella } from 'lucide-react';
import type { VacationBalanceView } from '@asistencia/contracts';
import { Button } from '@/components/ui/button';
import { panelClass } from '../identity/form-fields';
import { instant, label } from './common';

const movementNames: Record<string, string> = {
  GRANT: 'Días asignados por aniversario',
  ADJUSTMENT: 'Corrección de días',
  RESERVE: 'Días apartados para una solicitud',
  RELEASE: 'Días liberados de una solicitud',
  CONSUME: 'Vacaciones aprobadas',
  REFUND: 'Días devueltos por cancelación',
};

export function VacationBalanceCard({
  balance: b,
  own,
}: {
  balance: VacationBalanceView;
  own: boolean;
}) {
  return (
    <li className={`${panelClass} min-w-0 break-words !space-y-6`}>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vacaciones por aniversario
        </p>
        <h3 className="text-lg font-semibold">
          {b.employeeName} · Año de servicio {b.anniversaryYear}
        </h3>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-secondary/65 p-5">
        <div>
          <p className="text-sm text-muted-foreground">
            Disponibles para solicitar
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
            {b.available} <span className="text-base font-normal">días</span>
          </p>
        </div>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Umbrella className="size-6" aria-hidden="true" />
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-muted-foreground">En revisión</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {b.reserved} días
          </dd>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Apartados hasta que se decida la solicitud.
          </p>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Ya aprobados</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">
            {b.approvedDays} días
          </dd>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Ya descontados del saldo restante.
          </p>
        </div>
      </dl>
      {own && b.available > 0 && (
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link
            to="/solicitudes"
            search={{ create: 'VACATION', period: b.anniversaryYear }}
            aria-label={`Solicitar vacaciones del año ${b.anniversaryYear}`}
          >
            Solicitar vacaciones <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      )}
      {own && b.available <= 0 && (
        <p className="rounded-xl border p-4 text-sm leading-6">
          Este período no tiene días disponibles para una nueva solicitud.
          Revisa si tienes días en revisión u otro período disponible.
        </p>
      )}
      <details className="border-t pt-3">
        <summary className="cursor-pointer rounded-lg py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
          ¿Cómo se calculan estos días?
        </summary>
        <div className="mt-3 space-y-4 text-sm leading-6">
          <p>
            Saldo restante: <strong>{b.balance}</strong> días − en revisión:{' '}
            <strong>{b.reserved}</strong> días = disponibles:{' '}
            <strong>{b.available}</strong> días.
          </p>
          <dl className="grid gap-3 rounded-xl bg-secondary/40 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Días del aniversario</dt>
              <dd>{b.entitlement} días</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Saldo restante</dt>
              <dd>{b.balance} días</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Aprobados del período</dt>
              <dd>{b.approvedDays} días</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">De ellos, disfrutados</dt>
              <dd>{b.enjoyedDays} días</dd>
            </div>
          </dl>
          <p>
            Los disfrutados son días aprobados con fecha anterior a hoy. Forman
            parte de los aprobados; no se vuelven a restar.
          </p>
          <p>
            Al enviar una solicitud se apartan sus días. Si se rechaza o se
            retira, se liberan. Si se aprueba, se descuentan del saldo restante.
            Las correcciones quedan en el historial.
          </p>
        </div>
      </details>
      <details className="border-t pt-3">
        <summary className="cursor-pointer rounded-lg py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
          Ver movimientos del período
        </summary>
        {!b.movements.length ? (
          <p className="mt-3 text-sm">Sin movimientos registrados.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {b.movements.map((m) => (
              <li
                key={m.id}
                className="space-y-2 rounded-xl border p-4 text-sm leading-6"
              >
                <p className="font-medium">
                  {movementNames[m.kind] ?? label(m.kind)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {instant(m.createdAt)}
                </p>
                <p>
                  Días en saldo: {m.balanceDelta > 0 ? '+' : ''}
                  {m.balanceDelta} · Días en revisión:{' '}
                  {m.reservedDelta > 0 ? '+' : ''}
                  {m.reservedDelta}
                </p>
                <p>{m.reason}</p>
              </li>
            ))}
          </ol>
        )}
      </details>
    </li>
  );
}
