import { useRef } from 'react';
import { DropdownMenu } from 'radix-ui';
import { MoreHorizontal, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import type { EmployeeView } from '@asistencia/contracts';
import { Button } from '@/components/ui/button';

export function EmployeeActions({
  employee,
  onView,
  onEdit,
  onDelete,
  busy,
}: {
  employee: EmployeeView;
  onView: (employee: EmployeeView) => void;
  onEdit: ((employee: EmployeeView) => void) | undefined;
  onDelete: ((employee: EmployeeView) => void) | undefined;
  busy: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = useRef<(() => void) | null>(null);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          ref={trigger}
          variant="ghost"
          aria-label={`Acciones de ${employee.fullName}`}
          disabled={busy}
          className="size-11 rounded-lg p-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label={`Acciones de ${employee.fullName}`}
          align="end"
          sideOffset={6}
          collisionPadding={12}
          onCloseAutoFocus={(event) => {
            const action = selected.current;
            selected.current = null;
            if (action) {
              event.preventDefault();
              trigger.current?.focus();
              action();
            }
          }}
          className="mcr-floating-surface z-[60] max-h-[var(--radix-dropdown-menu-content-available-height)] w-60 max-w-[calc(100vw_-_1.5rem)] overflow-y-auto rounded-xl p-1.5 shadow-xl outline-none"
        >
          <DropdownMenu.Label className="break-words px-3 pb-2 pt-2 text-xs font-medium text-muted-foreground">
            {employee.fullName}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="mb-1 h-px bg-border/50" />
          <DropdownMenu.Item
            onSelect={() => {
              selected.current = () => onView(employee);
            }}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-secondary"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
            Ver expediente
          </DropdownMenu.Item>
          {onEdit && (
            <DropdownMenu.Item
              disabled={busy}
              onSelect={() => {
                selected.current = () => onEdit(employee);
              }}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-secondary"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-warning">
                <Pencil
                  className="size-4"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
              Editar empleado
            </DropdownMenu.Item>
          )}
          {onDelete && (
            <DropdownMenu.Item
              disabled={busy}
              onSelect={() => {
                selected.current = () => onDelete(employee);
              }}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-destructive outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-destructive/10"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2
                  className="size-4"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
              Eliminar empleado
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
