import { cloneElement, isValidElement, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/patterns/page-header';
import { InlineNotice } from '@/components/patterns/inline-notice';
export function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {isValidElement<Record<string, unknown>>(children)
        ? cloneElement(children, {
            'aria-invalid': Boolean(error),
            'aria-describedby': error ? `${id}-error` : undefined,
          })
        : children}
      {error && (
        <p role="alert" id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
export function Page({
  title,
  description,
  children,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-w-0 max-w-[1600px] space-y-7 px-4 pb-10 pt-8 sm:px-7 lg:px-10 lg:pt-10">
      <PageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        actions={actions}
      />
      {children}
    </main>
  );
}
export const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50';
export const panelClass =
  'min-w-0 space-y-5 rounded-2xl border border-border/70 bg-card p-5 sm:p-6';
export function FormError({ message }: { message?: string | undefined }) {
  return message ? <InlineNotice tone="danger">{message}</InlineNotice> : null;
}
