import { cn } from '@/lib/utils';

/** Marca visual del directorio, sin asignar categorías que no existen. */
export function DepartmentMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-navigation text-primary shadow-[inset_0_0_0_1px_rgb(250_219_37_/_20%)] [&>svg]:size-6',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 20V7.5L12 4v16M12 9h6.5v11M3.5 20h17" />
        <path d="M8.5 9v1M8.5 13v1M8.5 17v1" />
        <path d="M15.5 12.5v1M15.5 16v1" stroke="white" opacity=".7" />
      </svg>
    </span>
  );
}
