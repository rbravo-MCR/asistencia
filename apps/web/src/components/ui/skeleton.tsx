import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-xl bg-secondary motion-reduce:animate-none',
        className,
      )}
    />
  );
}

export function SkeletonGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" className={cn('space-y-4', className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
