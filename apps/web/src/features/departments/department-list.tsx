import type { DepartmentResponse } from '@asistencia/contracts';
import { CalendarDays } from 'lucide-react';
import { DepartmentMark } from './department-mark';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DepartmentActions } from './department-actions';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeZone: 'America/Merida',
});
export function DepartmentList({
  items,
  onEdit,
  onDelete,
  busy = false,
}: {
  items: DepartmentResponse[];
  onEdit?: ((department: DepartmentResponse) => void) | undefined;
  onDelete?: ((department: DepartmentResponse) => void) | undefined;
  busy?: boolean;
}) {
  return (
    <Table aria-label="Departamentos registrados" className="table-fixed">
      <TableHeader>
        <TableRow className="border-border/60 hover:bg-transparent">
          <TableHead className="h-11 pl-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:pl-5">
            Departamento
          </TableHead>
          <TableHead className="hidden w-48 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
            Fecha de creación
          </TableHead>
          {(onEdit || onDelete) && (
            <TableHead className="w-16 pr-3 text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="group border-border/40 hover:bg-secondary/60 focus-within:bg-secondary/50"
          >
            <TableCell className="whitespace-normal py-5 pl-4 sm:pl-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <DepartmentMark />
                <div className="min-w-0">
                  <span className="block break-words font-medium tracking-[-0.01em]">
                    {item.name}
                  </span>
                  <time
                    dateTime={item.createdAt}
                    className="mt-1 block text-xs text-muted-foreground sm:hidden"
                  >
                    {dateFormatter.format(new Date(item.createdAt))}
                  </time>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden text-[13px] text-muted-foreground sm:table-cell">
              <span className="inline-flex items-center gap-2">
                <CalendarDays
                  className="size-3.5 text-muted-foreground"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
                <time dateTime={item.createdAt} title="Fecha en America/Merida">
                  {dateFormatter.format(new Date(item.createdAt))}
                </time>
              </span>
            </TableCell>
            {(onEdit || onDelete) && (
              <TableCell className="py-4 pr-3 text-right">
                <DepartmentActions
                  department={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  busy={busy}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
