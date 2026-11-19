import { useSession } from '@/features/identity/use-session';
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() =>
  import('@/features/dashboard/dashboard').then((module) => ({
    default: module.Dashboard,
  })),
);
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, BriefcaseBusiness } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SystemStatus } from '@/features/system/system-status';
import { Page } from '@/features/identity/form-fields';
import { AsyncState } from '@/components/patterns/async-state';

export function HomePage() {
  const { session, loading, error, retry } = useSession();
  if (loading)
    return (
      <main className="mx-auto max-w-[1600px] p-6">
        <AsyncState kind="loading" title="Verificando sesión…" />
      </main>
    );
  if (error)
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <p role="alert">No se pudo verificar la sesión.</p>
        <Button onClick={retry}>Reintentar</Button>
      </main>
    );
  if (session)
    return (
      <Suspense
        fallback={
          <main className="mx-auto max-w-[1600px] p-6">
            <AsyncState kind="loading" title="Cargando inicio…" />
          </main>
        }
      >
        <Dashboard session={session} />
      </Suspense>
    );
  return (
    <Page
      title="Tu equipo, en un solo lugar."
      eyebrow="México Car Rental"
      description="Gestión de personal, asistencia y planificación para trabajar con claridad."
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="mcr-dashboard-hero rounded-2xl p-6 sm:p-10">
          <Badge variant="secondary" className="mb-6">
            Gestión de personal
          </Badge>
          <div className="max-w-2xl">
            <div className="mb-5 flex size-12 items-center justify-center rounded-xl border bg-card text-info">
              <BriefcaseBusiness aria-hidden="true" className="size-6" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Organiza tu jornada.
              <br />
              Mantén a tu equipo conectado.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
              Consulta los expedientes, departamentos y responsables de tu
              equipo. Ingresa con tu cuenta para acceder a la información
              autorizada.
            </p>
            <Button asChild className="mt-7 min-h-11">
              <Link to="/ingresar">
                Ingresar a mi cuenta
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>
              <h2 className="text-base">Conexión del sistema</h2>
            </CardTitle>
            <CardDescription>
              Consulta la disponibilidad de los servicios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SystemStatus />
          </CardContent>
        </Card>
      </div>
      <Link
        to="/departamentos"
        className="mt-6 inline-flex items-center gap-1 font-medium text-link underline underline-offset-4"
      >
        Gestionar departamentos
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    </Page>
  );
}
