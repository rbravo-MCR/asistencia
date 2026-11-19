import { Activity, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Page, panelClass } from '@/features/identity/form-fields';
import { SystemStatus } from '@/features/system/system-status';

export function SystemPage() {
  return (
    <Page
      eyebrow="Servicios"
      title="Estado del sistema"
      description="Comprueba la disponibilidad de los servicios antes de continuar."
      actions={
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      }
    >
      <section className={`${panelClass} max-w-3xl`}>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-secondary">
            <Activity aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Conexión del sistema</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta actual de la conexión y sus servicios.
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-background p-5">
          <SystemStatus />
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          La disponibilidad puede cambiar. Esta comprobación no modifica tus
          datos ni confirma operaciones pendientes.
        </p>
      </section>
    </Page>
  );
}
