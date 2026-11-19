import type { ReactNode } from 'react';
import { FolderOpen, LoaderCircle, TriangleAlert } from 'lucide-react';
export function AsyncState({
  kind,
  title,
  description,
  action,
}: {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const Icon =
    kind === 'loading'
      ? LoaderCircle
      : kind === 'error'
        ? TriangleAlert
        : FolderOpen;
  return (
    <div
      role={
        kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined
      }
      className="flex min-h-40 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-5 py-8 text-center"
    >
      <span
        className={`flex size-11 items-center justify-center rounded-xl ${kind === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}
      >
        <Icon
          aria-hidden="true"
          className={`size-5 ${kind === 'loading' ? 'animate-spin' : ''}`}
        />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
