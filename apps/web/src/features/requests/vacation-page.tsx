import { useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { ArrowUpRight, Plus, SlidersHorizontal } from 'lucide-react';
import { AsyncState } from '@/components/patterns/async-state';
import { InlineNotice } from '@/components/patterns/inline-notice';
import { VacationBalanceCard } from './vacation-balance-card';
import { useQuery } from '@tanstack/react-query';
import {
  EmployeeListSchema,
  VacationBalanceListSchema,
  type SessionView,
} from '@asistencia/contracts';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '../identity/protected-page';
import { Page, panelClass } from '../identity/form-fields';
import { QueryFeedback } from '../employees/query-feedback';
import { TextField, SelectField } from '../planning/controls';
import { useRequestWrite } from './common';
import {
  ReasonField,
  WriteStatus,
  RequestPanel,
  PanelActions,
} from './controls';
export function VacationPage() {
  return (
    <ProtectedPage>
      {(session) => <VacationContent session={session} />}
    </ProtectedPage>
  );
}
function VacationContent({ session }: { session: SessionView }) {
  const balances = useQuery({
    queryKey: ['vacation', 'balances'],
    queryFn: ({ signal }) =>
      request('/vacation/balances', VacationBalanceListSchema, { signal }),
    retry: false,
  });
  const employees = useQuery({
    queryKey: ['vacation', 'employees'],
    queryFn: ({ signal }) =>
      request('/employees', EmployeeListSchema, { signal }),
    enabled: session.permissions.manageOrganization,
    retry: false,
  });
  const write = useRequestWrite(session.csrfToken);
  const [administration, setAdministration] = useState<
    'grant' | 'adjustment' | null
  >(null);
  const search = useSearch({ strict: false }) as { view?: 'team' };
  const manager = session.permissions.manageOrganization;
  const [view, setView] = useState<'mine' | 'team'>(
    manager && (search.view === 'team' || !session.employeeId)
      ? 'team'
      : 'mine',
  );
  const [employeeFilter, setEmployeeFilter] = useState('');
  const team = manager && view === 'team';
  const items = balances.isError ? [] : (balances.data?.items ?? []);
  const visible = items.filter((item) =>
    team
      ? !employeeFilter || item.employeeId === employeeFilter
      : item.employeeId === session.employeeId,
  );
  const people = [
    ...new Map(
      items.map((item) => [item.employeeId, item.employeeName]),
    ).entries(),
  ];
  return (
    <Page
      eyebrow="Vacaciones y permisos"
      title="Vacaciones y días disponibles"
      actions={
        session.employeeId ? (
          <Button asChild className="min-h-11">
            <Link to="/solicitudes" search={{ create: 'VACATION' }}>
              Solicitar vacaciones <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        ) : undefined
      }
      description={
        manager
          ? 'Consulta tus días o administra los del equipo. Solicitar vacaciones y asignar días son acciones diferentes.'
          : 'Revisa los días que puedes pedir y el estado de los que ya solicitaste.'
      }
    >
      {!administration && <WriteStatus write={write} />}
      {manager && (
        <div
          aria-label="Vista de vacaciones"
          className="flex w-fit max-w-full gap-1 rounded-xl border bg-card p-1"
        >
          <Button
            type="button"
            variant={team ? 'ghost' : 'secondary'}
            className="min-h-11"
            aria-pressed={!team}
            onClick={() => setView('mine')}
          >
            Mis días
          </Button>
          <Button
            type="button"
            variant={team ? 'secondary' : 'ghost'}
            className="min-h-11"
            aria-pressed={team}
            onClick={() => setView('team')}
          >
            Equipo
          </Button>
        </div>
      )}
      {!team && !session.employeeId && (
        <InlineNotice tone="warning">
          <p className="font-medium">
            Tu acceso todavía no está vinculado a un empleado.
          </p>
          <p className="mt-1 text-sm leading-6">
            Para solicitar días necesitas tu expediente de empleado.{' '}
            {manager
              ? 'En Empleados, selecciona tu cuenta en el expediente correspondiente.'
              : 'Pide a Recursos Humanos que vincule tu cuenta con tu expediente.'}
          </p>
          {manager && (
            <Link
              className="mt-3 inline-flex min-h-11 items-center text-link underline"
              to="/empleados"
            >
              Revisar empleados
            </Link>
          )}
        </InlineNotice>
      )}
      {team && (
        <section
          className={panelClass}
          aria-label="Administrar días del equipo"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Días del equipo</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Asigna los días de un aniversario cumplido o corrige un registro
                con motivo. Esto no envía ni aprueba una solicitud de
                vacaciones.
              </p>
            </div>
            <div className="flex max-w-full flex-wrap gap-2">
              <Button
                id="vacation-grant"
                className="min-h-11"
                disabled={write.blocked}
                onClick={() => setAdministration('grant')}
              >
                <Plus aria-hidden="true" />
                Asignar días
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={write.blocked}
                onClick={() => setAdministration('adjustment')}
              >
                <SlidersHorizontal aria-hidden="true" />
                Corregir días
              </Button>
            </div>
          </div>
          <label
            className="block max-w-lg space-y-2 text-sm font-medium"
            htmlFor="vacation-employee-filter"
          >
            <span>Filtrar por empleado</span>
            <select
              id="vacation-employee-filter"
              className="block min-h-11 w-full rounded-lg border border-input bg-card px-3 font-normal"
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
            >
              <option value="">Todo el equipo con días asignados</option>
              {people.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      {!team && session.employeeId && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Tus días, por aniversario</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Elige de qué período quieres pedir días. Los que están en revisión
            ya están apartados y no cuentan como disponibles.
          </p>
        </div>
      )}
      {(balances.isPending || balances.isError) && (
        <QueryFeedback query={balances} />
      )}
      {balances.isSuccess &&
        (team || session.employeeId) &&
        visible.length === 0 && (
          <AsyncState
            kind="empty"
            title={
              team
                ? 'No hay días asignados en esta selección'
                : 'Todavía no tienes un período con días asignados'
            }
            description={
              team
                ? 'Asigna un aniversario cumplido o selecciona otro empleado para consultar sus días.'
                : 'Recursos Humanos debe registrar tu período y su saldo. No se calcula el saldo pendiente solo a partir de tu antigüedad.'
            }
            action={
              manager && !team ? (
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setView('team')}
                >
                  Administrar días
                </Button>
              ) : undefined
            }
          />
        )}
      <ul
        className="grid items-start gap-5 xl:grid-cols-2"
        aria-label={team ? 'Períodos del equipo' : 'Mis períodos de vacaciones'}
      >
        {visible.map((balance) => (
          <VacationBalanceCard
            key={`${balance.employeeId}-${balance.anniversaryYear}`}
            balance={balance}
            own={balance.employeeId === session.employeeId}
          />
        ))}
      </ul>
      {balances.isSuccess && (
        <Button
          variant="ghost"
          className="min-h-11 w-fit"
          disabled={balances.isFetching}
          onClick={() => void balances.refetch()}
        >
          Actualizar días
        </Button>
      )}
      {session.permissions.manageOrganization && administration && (
        <RequestPanel
          title={
            administration === 'grant'
              ? 'Asignar días por aniversario'
              : 'Corregir días'
          }
          description="Selecciona a la persona, el aniversario y un motivo. Los cambios quedan en el historial."
          write={write}
          initialFocusId={`${administration}-employee`}
          returnFocusId="vacation-grant"
          onClose={() => setAdministration(null)}
        >
          <section className="mt-4 space-y-5">
            <p className="rounded-xl border bg-secondary/50 p-4 text-sm">
              La concesión calcula los días por antigüedad con la política
              vigente. No se crean saldos históricos automáticamente. Los
              ajustes requieren un motivo y conservan el historial.
            </p>
            <QueryFeedback query={employees} />
            <div className="space-y-5">
              {[administration].map((mode) => (
                <form
                  id={`vacation-${mode}`}
                  key={mode}
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const employeeId = String(data.get(`${mode}-employee`)),
                      anniversaryYear = Number(data.get(`${mode}-year`)),
                      reason = String(data.get(`${mode}-reason`)).trim();
                    void write.run(
                      mode === 'grant'
                        ? '/vacation/grants'
                        : '/vacation/adjustments',
                      {
                        employeeId,
                        anniversaryYear,
                        reason,
                        ...(mode === 'adjustment'
                          ? { days: Number(data.get('adjustment-days')) }
                          : {}),
                      },
                      {
                        message:
                          mode === 'grant'
                            ? 'Días asignados al período del empleado.'
                            : 'Ajuste conservado en el historial.',
                        onSuccess: () => setAdministration(null),
                      },
                    );
                  }}
                >
                  <h3 className="text-lg font-semibold">
                    {mode === 'grant'
                      ? 'Asignar días por aniversario'
                      : 'Corregir días'}
                  </h3>
                  <fieldset
                    disabled={write.blocked}
                    className="min-w-0 space-y-4"
                  >
                    <SelectField
                      name={`${mode}-employee`}
                      label={
                        mode === 'grant'
                          ? 'Empleado para concesión'
                          : 'Empleado para ajuste'
                      }
                    >
                      <option value="">Selecciona un empleado</option>
                      {employees.data?.items
                        .filter((e) => e.status === 'ACTIVE')
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.employeeNumber} · {e.fullName}
                          </option>
                        ))}
                    </SelectField>
                    <TextField
                      name={`${mode}-year`}
                      label={
                        mode === 'grant'
                          ? 'Año de servicio para concesión'
                          : 'Año de servicio para ajuste'
                      }
                      type="number"
                      min={1}
                      max={100}
                    />
                    {mode === 'adjustment' && (
                      <TextField
                        name="adjustment-days"
                        label="Días del ajuste (negativo para descontar)"
                        type="number"
                        min={-365}
                        max={365}
                      />
                    )}
                    <ReasonField
                      name={`${mode}-reason`}
                      label={
                        mode === 'grant'
                          ? 'Motivo de la concesión'
                          : 'Motivo del ajuste'
                      }
                    />
                    <PanelActions>
                      <Button
                        form={`vacation-${mode}`}
                        type="submit"
                        disabled={write.blocked || !employees.data}
                      >
                        {mode === 'grant'
                          ? 'Conceder período'
                          : 'Guardar ajuste'}
                      </Button>
                    </PanelActions>
                  </fieldset>
                </form>
              ))}
            </div>
          </section>
        </RequestPanel>
      )}
    </Page>
  );
}
