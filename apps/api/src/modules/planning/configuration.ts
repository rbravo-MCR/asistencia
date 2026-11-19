import { and, eq, gte, lte } from 'drizzle-orm';
import type { ConfigurationIssue } from '@asistencia/contracts';
import type { Database } from '../../infrastructure/database/client.js';
import { employees } from '../employees/schema.js';
import { shiftTemplates, holidays, scheduleAssignments } from './schema.js';
export async function readPlanningConfiguration(
  db: Database,
  date: string,
  throughDate: string,
): Promise<ConfigurationIssue[]> {
  const staff = await db
    .select()
    .from(employees)
    .where(eq(employees.status, 'ACTIVE'));
  const templates = await db
    .select()
    .from(shiftTemplates)
    .where(eq(shiftTemplates.active, true));
  const scheduled = await db
    .select({ employeeId: scheduleAssignments.employeeId })
    .from(scheduleAssignments)
    .where(
      and(
        eq(scheduleAssignments.status, 'PUBLISHED'),
        gte(scheduleAssignments.workDate, date),
        lte(scheduleAssignments.workDate, throughDate),
      ),
    );
  const festive = await db.select({ id: holidays.id }).from(holidays).limit(1);
  const issues: ConfigurationIssue[] = [];
  const missing = staff.filter(
    (e) => !templates.some((t) => t.category === e.category),
  ).length;
  if (missing)
    issues.push({
      code: 'SHIFT_TEMPLATES_REQUIRED',
      title: 'Sin plantilla activa para su categoría',
      detail: 'Revisa las plantillas antes de asignar jornadas.',
      count: missing,
      severity: 'WARNING',
      href: '/turnos',
    });
  const unscheduled = staff.filter(
    (e) => !scheduled.some((s) => s.employeeId === e.id),
  ).length;
  if (unscheduled)
    issues.push({
      code: 'NO_UPCOMING_SHIFTS',
      title: 'Sin turnos publicados en los próximos 7 días',
      detail: `Intervalo ${date} a ${throughDate}. Es informativo: no implica falta.`,
      count: unscheduled,
      severity: 'INFO',
      href: `/calendario?from=${date}&to=${throughDate}`,
    });
  if (!festive.length)
    issues.push({
      code: 'NO_HOLIDAYS',
      title: 'Sin festivos cargados',
      detail: 'Revisa el calendario aplicable a la empresa.',
      count: 1,
      severity: 'INFO',
      href: '/turnos',
    });
  return issues;
}
