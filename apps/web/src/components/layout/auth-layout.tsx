import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarDays, Clock3, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { ThemeSelect } from '@/components/theme-select';
import logo from '../../../../../assets/logo-MCR (1).png';

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-dvh flex-col">
      <header className="border-b border-white/10 bg-navigation text-navigation-foreground">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link to="/" aria-label="Ir al inicio">
            <img
              src={logo}
              alt="México Car Rental"
              width={800}
              height={725}
              className="h-11 w-32 object-cover sm:w-36"
            />
          </Link>
          <ThemeSelect />
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 lg:grid-cols-2">
        <section
          aria-label="Gestión de personal MCR"
          className="mcr-auth-art relative hidden min-h-[680px] flex-col justify-between overflow-hidden bg-navigation p-12 text-navigation-foreground lg:flex xl:p-16"
        >
          <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-white/60">
            México Car Rental · Gestión de personal
          </p>
          <div className="relative max-w-lg py-12">
            <span className="mb-8 inline-flex size-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
              <Clock3 className="size-7" aria-hidden="true" />
            </span>
            <h2 className="text-4xl font-medium leading-tight tracking-tight xl:text-5xl">
              Tu equipo.
              <br />
              Tu tiempo.
              <br />
              <span className="text-primary">Todo en orden.</span>
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-white/65">
              Un espacio para organizar la jornada, consultar la planificación y
              dar seguimiento a las solicitudes.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-5 text-xs text-white/65">
            <span className="flex items-center gap-2">
              <CalendarDays
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Planificación clara
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Acceso autorizado
            </span>
          </div>
        </section>
        <div className="flex min-w-0 flex-col justify-center px-4 py-10 sm:px-10 lg:px-12 xl:px-20">
          <div className="mcr-floating-surface mx-auto w-full max-w-md rounded-2xl p-6 shadow-sm sm:p-8">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Tu espacio de trabajo
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <div className="min-h-64">{children}</div>
          </div>
          <nav
            aria-label="Acceso público"
            className="mx-auto mt-6 flex w-full max-w-md flex-wrap justify-between gap-4 text-xs text-muted-foreground"
          >
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-1 hover:text-foreground"
            >
              Volver al inicio
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
            <Link
              to="/estado"
              className="inline-flex min-h-11 items-center gap-1 hover:text-foreground"
            >
              Estado del sistema
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </main>
      <footer className="border-t px-4 py-4 text-center text-[11px] text-muted-foreground">
        México Car Rental · Uso interno
      </footer>
    </div>
  );
}
