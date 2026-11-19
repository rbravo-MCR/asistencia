import { Link } from '@tanstack/react-router';
import { Page } from '@/features/identity/form-fields';
import { AsyncState } from '@/components/patterns/async-state';
import { Button } from '@/components/ui/button';
export function RouteErrorPage() {
  return (
    <Page eyebrow="Recuperación" title="No se pudo cargar la página">
      <AsyncState
        kind="error"
        title="La sección no está disponible en este momento"
        description="Puedes volver al inicio o recargar la página para intentarlo otra vez."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => window.location.reload()}>
              Recargar página
            </Button>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-lg border bg-card px-4 text-sm font-medium"
            >
              Volver al inicio
            </Link>
          </div>
        }
      />
    </Page>
  );
}
