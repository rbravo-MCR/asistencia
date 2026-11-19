import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useSession } from '@/features/identity/use-session';
import logo from '../../../../assets/logo-MCR (1).png';
import { ThemeSelect } from '@/components/theme-select';
import { AppShell } from '@/components/layout/app-shell';

export function RootLayout() {
  const { session, loading } = useSession();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const accessPage = pathname === '/ingresar' || pathname === '/recuperar';
  return (
    <>
      <a
        href="#contenido"
        className="sr-only rounded-md bg-card p-3 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70]"
      >
        Saltar al contenido
      </a>
      {accessPage ? (
        <div id="contenido" tabIndex={-1}>
          <Outlet />
        </div>
      ) : session || loading ? (
        <AppShell session={session}>
          <Outlet />
        </AppShell>
      ) : (
        <div className="min-h-screen">
          <header className="border-b border-navigation-hover bg-navigation text-navigation-foreground">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
              <Link to="/" aria-label="Ir al inicio">
                <img
                  src={logo}
                  alt="MCR"
                  width={800}
                  height={725}
                  className="h-10 w-44 object-cover"
                />
              </Link>
              <nav
                aria-label="Principal"
                className="flex flex-wrap items-center gap-4 text-sm"
              >
                <Link to="/" activeOptions={{ exact: true }}>
                  Inicio
                </Link>
                <Link to="/ingresar">Ingresar</Link>
                <Link to="/estado">Estado del sistema</Link>
              </nav>
              <ThemeSelect />
            </div>
          </header>
          <div id="contenido" tabIndex={-1}>
            <Outlet />
          </div>
          <footer className="mx-auto max-w-5xl px-6 pb-8 text-xs text-muted-foreground">
            MCR · Uso interno
          </footer>
        </div>
      )}
    </>
  );
}
