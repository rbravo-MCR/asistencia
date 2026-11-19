import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import type { NavigationGroup } from './navigation';
import logo from '../../../../../assets/logo-MCR (1).png';

export function Sidebar({
  navigation,
  collapsed = false,
  onNavigate,
}: {
  navigation: NavigationGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const path = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    const nav = navRef.current;
    const active = [
      ...(nav?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []),
    ].find((link) => link.getAttribute('href') === path);
    if (!nav || !active) return;
    const bounds = nav.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    if (item.bottom > bounds.bottom)
      nav.scrollTop += item.bottom - bounds.bottom + 16;
    else if (item.top < bounds.top) nav.scrollTop -= bounds.top - item.top + 16;
  }, [path, collapsed, navigation]);
  return (
    <>
      <div className="shrink-0 border-b border-white/10 px-5 py-5">
        <Link
          to="/"
          aria-label="Ir al inicio"
          onClick={onNavigate}
          className="block rounded-md"
        >
          {collapsed ? (
            <span className="flex h-10 items-center justify-center text-lg font-bold text-primary">
              MCR
            </span>
          ) : (
            <img
              src={logo}
              alt="México Car Rental"
              width={800}
              height={725}
              className="h-10 w-44 object-cover"
            />
          )}
        </Link>
        {!collapsed && (
          <p className="mt-3 text-[10px] font-semibold tracking-[0.2em] text-white/60">
            GESTIÓN DE PERSONAL
          </p>
        )}
      </div>
      <nav
        ref={navRef}
        aria-label="Principal"
        className="mcr-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
      >
        {navigation.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    aria-label={label}
                    title={collapsed ? label : undefined}
                    activeOptions={{ exact: to !== '/configuracion' }}
                    onClick={onNavigate}
                    className={`flex min-h-11 items-center xl:min-h-10 gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-navigation-hover hover:text-white ${collapsed ? 'justify-center' : ''}`}
                    activeProps={{
                      className: 'bg-primary text-primary-foreground',
                      'aria-current': 'page',
                    }}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {!collapsed && (
        <div className="shrink-0 border-t border-white/10 px-6 py-4 text-[11px] text-white/60">
          México Car Rental{' '}
          <span className="block text-white/45">Plataforma interna · MCR</span>
        </div>
      )}
    </>
  );
}
