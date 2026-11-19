import { Link } from '@tanstack/react-router';
import { Page } from '@/features/identity/form-fields';
import { AsyncState } from '@/components/patterns/async-state';
export function NotFoundPage() {
  return (
    <Page
      eyebrow="404"
      title="Página no encontrada"
      description="La dirección no existe o ya no está disponible."
    >
      <AsyncState
        kind="empty"
        title="Continúa desde el inicio"
        description="Desde allí puedes acceder a las secciones disponibles para tu cuenta."
        action={
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Volver al inicio
          </Link>
        }
      />
    </Page>
  );
}
