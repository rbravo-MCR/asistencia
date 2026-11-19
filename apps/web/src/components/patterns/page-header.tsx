import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  eyebrow = 'Gestión de personal',
  actions,
}: {
  title: string;
  description?: string | undefined;
  eyebrow?: string | undefined;
  actions?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-5">
      <div className="min-w-0 max-w-3xl">
        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="break-words text-[28px] font-semibold tracking-[-0.035em] sm:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
