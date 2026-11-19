import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

const tones: Record<StatusTone, string> = {
  neutral: 'border-border bg-secondary text-secondary-foreground',
  info: 'border-primary/30 bg-primary/10 text-primary',
  success:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning:
    'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export function StatusBadge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
