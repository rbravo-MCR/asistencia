import { Page } from '@/features/identity/form-fields';
import { AsyncState } from '@/components/patterns/async-state';
export function RoutePendingPage() {
  return (
    <Page eyebrow="Asistencia" title="Preparando tu sección">
      <AsyncState
        kind="loading"
        title="Cargando sección…"
        description="Estamos preparando la información disponible para tu cuenta."
      />
    </Page>
  );
}
