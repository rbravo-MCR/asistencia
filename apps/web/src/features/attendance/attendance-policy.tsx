import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AttendancePolicySchema,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass, FormError } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { TextField } from '../planning/controls';
export function AttendancePolicyPage() {
  return (
    <ProtectedPage permission="manageOrganization">
      {(session) => (
        <Page
          title="Política de asistencia"
          eyebrow="Configuración · Versiones"
          description="Los cambios crean una versión nueva y conservan los controles anteriores."
        >
          <AttendancePolicy session={session} />
        </Page>
      )}
    </ProtectedPage>
  );
}
export function AttendancePolicy({ session }: { session: SessionView }) {
  const client = useQueryClient();
  const policy = useQuery({
    queryKey: ['attendance', 'policy'],
    queryFn: ({ signal }) =>
      request('/attendance/policy', AttendancePolicySchema, { signal }),
    retry: false,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <section className={panelClass}>
      <h2 className="text-xl font-semibold">Configuración de asistencia</h2>
      <QueryFeedback query={policy} />
      {policy.data && (
        <form
          key={policy.data.id}
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending) return;
            const d = new FormData(e.currentTarget);
            setPending(true);
            setError(null);
            setSaved(false);
            try {
              await request('/attendance/policy', AttendancePolicySchema, {
                method: 'PUT',
                csrfToken: session.csrfToken,
                body: {
                  lateToleranceMinutes: Number(d.get('lateToleranceMinutes')),
                  earlyEntryMinutes: Number(d.get('earlyEntryMinutes')),
                  lateExitMinutes: Number(d.get('lateExitMinutes')),
                  administrativeAbsenceMinutes:
                    String(d.get('administrativeAbsenceMinutes')).trim() === ''
                      ? null
                      : Number(d.get('administrativeAbsenceMinutes')),
                },
              });
              await client.invalidateQueries({ queryKey: ['attendance'] });
              setSaved(true);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : 'No se pudo guardar.',
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <p>
            Versión {policy.data.version}. Los controles iniciados conservan su
            política.
          </p>
          <fieldset
            disabled={pending}
            className="grid min-w-0 gap-5 md:grid-cols-2"
          >
            <TextField
              name="lateToleranceMinutes"
              label="Tolerancia de entrada (min)"
              type="number"
              min={0}
              max={120}
              value={policy.data.lateToleranceMinutes}
            />
            <TextField
              name="earlyEntryMinutes"
              label="Entrada anticipada (min)"
              type="number"
              min={0}
              max={1440}
              value={policy.data.earlyEntryMinutes}
            />
            <TextField
              name="lateExitMinutes"
              label="Salida posterior (min)"
              type="number"
              min={0}
              max={1440}
              value={policy.data.lateExitMinutes}
            />
            <TextField
              name="administrativeAbsenceMinutes"
              label="Falta por llegada tardía administrativa (min)"
              type="number"
              min={1}
              max={1440}
              value={policy.data.administrativeAbsenceMinutes ?? ''}
              required={false}
            />
          </fieldset>
          <p className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm leading-6">
            30 minutos corresponde a las 08:30 si la jornada inicia a las 08:00.
            Se acepta el marcaje con falta justificable; requiere decisión de
            jefatura. Vacío desactiva el corte. No se aplica a turnos
            operativos.
          </p>
          <Button disabled={pending} className="min-h-11">
            {pending ? 'Guardando política…' : 'Guardar política'}
          </Button>
        </form>
      )}
      <FormError message={error ?? undefined} />
      {saved && <p role="status">Nueva versión de política guardada.</p>}
    </section>
  );
}
