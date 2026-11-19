import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import type { SessionView } from '@asistencia/contracts';
import {
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  LayoutDashboard,
  Clock3,
  CalendarDays,
  Ellipsis,
} from 'lucide-react';
import { sessionScope } from '@/lib/session-scope';
import { ThemeSelect } from '@/components/theme-select';
import { SidePanel } from '@/components/ui/side-panel';
import { navigationFor, navigationLocation } from './navigation';
import { Sidebar } from './sidebar';
import { RouteSearch } from './route-search';

export function AppShell({
  session,
  children,
}: {
  session: SessionView | null | undefined;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigation = navigationFor(session?.permissions);
  const location = navigationLocation(path, navigation);
  const initials = (session?.user.name ?? 'MCR')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  return (
    <div
      style={
        { '--shell-sidebar': collapsed ? '5rem' : '16rem' } as CSSProperties
      }
      className="min-h-screen xl:pl-[var(--shell-sidebar)]"
    >
      <aside
        aria-label="Navegación de MCR"
        className="fixed inset-y-0 left-0 z-30 hidden w-[var(--shell-sidebar)] flex-col bg-navigation text-navigation-foreground xl:flex"
      >
        <Sidebar navigation={navigation} collapsed={collapsed} />
      </aside>
      <header className="mcr-shell-header sticky top-0 z-40 min-h-[max(72px,4.5rem)] border-b border-white/10 bg-navigation text-navigation-foreground">
        <div className="flex min-h-[calc(max(72px,4.5rem)_-_1px)] flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidePanel
              open={menuOpen}
              onOpenChange={setMenuOpen}
              title="Menú principal"
              description="Secciones disponibles para tu cuenta."
              side="left"
              className="bg-navigation text-navigation-foreground [&_[data-panel-description]]:text-white/65 [&_button:hover]:bg-navigation-hover"
              trigger={
                <button
                  aria-label="Abrir menú principal"
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-navigation-hover xl:hidden"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </button>
              }
            >
              <Sidebar
                navigation={navigation}
                onNavigate={() => setMenuOpen(false)}
              />
            </SidePanel>
            <button
              aria-label={
                collapsed ? 'Expandir navegación' : 'Contraer navegación'
              }
              onClick={() => setCollapsed(!collapsed)}
              className="hidden size-11 shrink-0 items-center justify-center rounded-lg hover:bg-navigation-hover xl:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-5" />
              ) : (
                <PanelLeftClose className="size-5" />
              )}
            </button>
            <div className="hidden min-w-0 items-center gap-2 text-sm min-[390px]:flex">
              <span className="hidden text-white/60 md:inline">
                {location.group}
              </span>
              <ChevronRight
                className="hidden size-3.5 text-primary md:block"
                aria-hidden="true"
              />
              <span className="truncate font-medium">{location.label}</span>
            </div>
          </div>
          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:gap-4">
            <RouteSearch navigation={navigation} />
            <ThemeSelect />
            <Link
              to="/avisos"
              aria-label="Abrir mis avisos"
              className="hidden size-11 items-center justify-center rounded-lg hover:bg-navigation-hover sm:flex"
            >
              <Bell className="size-5" aria-hidden="true" />
            </Link>
            <Link
              to="/cuenta"
              aria-label="Abrir mi cuenta"
              className="hidden items-center gap-3 rounded-lg border-l border-white/15 pl-4 sm:flex"
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-primary/35 bg-navigation-hover text-xs font-semibold text-primary">
                {initials}
              </span>
              <span className="hidden max-w-40 truncate text-sm lg:block">
                {session?.user.name ?? 'Verificando sesión…'}
              </span>
            </Link>
          </div>
        </div>
      </header>
      <div
        key={sessionScope(session) ?? 'anonymous'}
        id="contenido"
        tabIndex={-1}
        className="min-h-[calc(100svh_-_72px)] min-w-0 pb-24 outline-none xl:pb-0"
      >
        {children}
      </div>
      <footer className="mx-auto max-w-[1600px] px-6 pb-24 text-xs text-muted-foreground xl:pb-6">
        México Car Rental · Uso interno
      </footer>
      <nav
        aria-label="Accesos rápidos"
        className="mcr-mobile-navigation fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card px-2 pt-2 xl:hidden"
      >
        {(
          [
            {
              to: '/',
              label: 'Inicio',
              name: 'Inicio rápido',
              icon: LayoutDashboard,
            },
            {
              to: '/asistencia',
              label: 'Jornada',
              name: 'Abrir mi jornada',
              icon: Clock3,
            },
            {
              to: '/calendario',
              label: session?.permissions.manageOrganization
                ? 'Asignar turnos'
                : 'Mis horarios',
              name: session?.permissions.manageOrganization
                ? 'Asignar turnos rápido'
                : 'Mis horarios rápido',
              icon: CalendarDays,
            },
          ] as const
        ).map(({ to, label, name, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={name}
            activeOptions={{ exact: true }}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] text-muted-foreground"
            activeProps={{
              className: 'bg-secondary text-foreground',
              'aria-current': 'page',
            }}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Más secciones"
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] text-muted-foreground"
        >
          <Ellipsis className="size-5" aria-hidden="true" />
          Más
        </button>
      </nav>
    </div>
  );
}
