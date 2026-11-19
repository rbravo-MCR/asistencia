import { attendanceSessions } from '../../attendance/schema.js';
import { getApprovedCoverage } from '../../requests/index.js';
import { assertOrganizationAdministrator } from '../../identity/index.js';
import { users, userRoles } from '../../identity/schema.js';
import {
  OFFICIAL_HOLIDAYS,
  OFFICIAL_CALENDAR_SOURCES,
} from '../domain/official-holidays.js';
import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import type {
  SessionView,
  ShiftTemplateInput,
  HolidayInput,
  ScheduleAssignmentInput,
} from '@asistencia/contracts';
import type { Database } from '../../../infrastructure/database/client.js';
import { employees } from '../../employees/schema.js';
import {
  workLocations,
  locationAuthorizations,
} from '../../locations/schema.js';
import {
  recordAudit,
  enqueueNotifications,
  getAuditContext,
} from '../../audit/index.js';
import { shiftTemplates, holidays, scheduleAssignments } from '../schema.js';
import {
  civilDate,
  civilInterval,
  fail,
  normalizeTemplate,
  validateCalendarRange,
} from '../domain/planning.js';
type Executor = Pick<
  Database,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;
async function lock(tx: Executor) {
  await tx.execute(sql`select pg_advisory_xact_lock(81209002)`);
  await tx.execute(sql`select pg_advisory_xact_lock(81211001)`);
}
function translate(error: unknown): never {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause && typeof cause === 'object' && 'code' in cause) {
    if (cause.code === '23503')
      fail(
        'El registro conserva referencias; desactívalo para preservar el historial.',
        'PLANNING_IN_USE',
        409,
      );
    if (cause.code === '23505')
      fail('Ya existe un festivo en esa fecha.', 'PLANNING_CONFLICT', 409);
  }
  throw error;
}
function snapshot(t: typeof shiftTemplates.$inferSelect) {
  return {
    name: t.name,
    category: t.category,
    modality: t.modality,
    startTime: t.startTime,
    endTime: t.endTime,
    weekdays: t.weekdays,
    timeZone: t.timeZone,
    active: t.active,
    version: t.version,
  };
}
export async function initializePlanningDefaults(db: Executor) {
  const common = { timeZone: 'America/Merida', active: true, version: 1 };
  await db
    .insert(shiftTemplates)
    .values([
      {
        ...common,
        defaultKey: 'ADMINISTRATIVE_INITIAL',
        name: 'Jornada administrativa',
        category: 'ADMINISTRATIVE',
        modality: 'ONSITE',
        startTime: '08:00',
        endTime: '17:00',
        weekdays: [1, 2, 3, 4, 5],
      },
      ...[
        ['08:00', '16:00'],
        ['16:00', '00:00'],
        ['00:00', '08:00'],
      ].map(([startTime, endTime], i) => ({
        ...common,
        defaultKey: `OPERATIONAL_INITIAL_${i + 1}`,
        name: `Turno operativo ${i + 1}`,
        category: 'OPERATIONAL' as const,
        modality: 'HOME_OFFICE' as const,
        startTime: startTime!,
        endTime: endTime!,
        weekdays: [1, 2, 3, 4, 5, 6, 7],
      })),
    ])
    .onConflictDoNothing();
}
export function createPlanningService(db: Database) {
  async function mutate<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
    try {
      return await db.transaction(async (tx) => {
        await lock(tx);
        return fn(tx);
      });
    } catch (error) {
      return translate(error);
    }
  }
  async function getSlot(tx: Executor, id: string) {
    const [row] = await tx
      .select()
      .from(scheduleAssignments)
      .where(eq(scheduleAssignments.id, id));
    if (!row) fail('Asignación no encontrada.', 'PLANNING_NOT_FOUND', 404);
    return row;
  }
  async function validateSlot(
    tx: Executor,
    input: ScheduleAssignmentInput,
    id?: string,
    existingTemplate?: typeof shiftTemplates.$inferSelect,
  ) {
    civilDate(input.workDate);
    const [employee] = await tx
      .select()
      .from(employees)
      .where(eq(employees.id, input.employeeId));
    const [loaded] = existingTemplate
      ? [existingTemplate]
      : await tx
          .select()
          .from(shiftTemplates)
          .where(eq(shiftTemplates.id, input.templateId));
    if (!employee || employee.status !== 'ACTIVE')
      fail('Selecciona un empleado activo.');
    if (!loaded || !loaded.active) fail('Selecciona una plantilla activa.');
    const template = normalizeTemplate(loaded);
    if (employee.category !== template.category)
      fail('La categoría del empleado no corresponde a la plantilla.');
    const weekday = civilDate(input.workDate).getUTCDay() || 7;
    if (input.kind === 'REGULAR' && !template.weekdays.includes(weekday))
      fail('El día no está habilitado en la plantilla.');
    const [holiday] = await tx
      .select()
      .from(holidays)
      .where(eq(holidays.date, input.workDate));
    if (holiday && input.kind !== 'DUTY')
      fail('En un festivo debes asignar una guardia.');
    const locationId = input.locationId ?? null;
    if (template.modality === 'HOME_OFFICE' && locationId)
      fail('Home office no admite centro presencial.');
    if (template.modality === 'ONSITE') {
      if (!locationId) fail('Selecciona un centro autorizado.');
      const authorized = await tx
        .select({ id: workLocations.id })
        .from(workLocations)
        .innerJoin(
          locationAuthorizations,
          eq(locationAuthorizations.locationId, workLocations.id),
        )
        .where(
          and(
            eq(workLocations.id, locationId),
            eq(workLocations.active, true),
            eq(locationAuthorizations.employeeId, employee.id),
            isNull(locationAuthorizations.revokedAt),
            lte(locationAuthorizations.startsOn, input.workDate),
            or(
              isNull(locationAuthorizations.endsOn),
              gte(locationAuthorizations.endsOn, input.workDate),
            ),
          ),
        );
      if (!authorized.length)
        fail('El centro no está activo o autorizado para esa fecha.');
    }
    const interval = civilInterval(input.workDate, template);
    // PostgreSQL is the persistence authority for IANA conversions as well.
    const conversion = await tx.execute(
      sql`select (${input.workDate}::date + ${template.startTime}::time) at time zone ${template.timeZone} as starts_at`,
    );
    const converted = conversion.rows[0]?.starts_at;
    if (
      new Date(converted as string | Date).getTime() !==
      interval.startsAt.getTime()
    )
      fail('La zona horaria no coincide con la configuración de PostgreSQL.');
    const overlap = await tx
      .select({ id: scheduleAssignments.id })
      .from(scheduleAssignments)
      .where(
        and(
          eq(scheduleAssignments.employeeId, input.employeeId),
          ne(scheduleAssignments.status, 'CANCELLED'),
          id ? ne(scheduleAssignments.id, id) : undefined,
          lt(scheduleAssignments.startsAt, interval.endsAt),
          gt(scheduleAssignments.endsAt, interval.startsAt),
        ),
      );
    if (overlap.length)
      fail(
        'El horario se superpone con otra asignación.',
        'PLANNING_CONFLICT',
        409,
      );
    return {
      ...input,
      locationId,
      ...interval,
      templateVersion: loaded.version,
      templateName: loaded.name,
      modality: template.modality,
      timeZone: template.timeZone,
      snapshot: snapshot(loaded),
    };
  }
  return {
    async listTemplates() {
      return (
        await db.select().from(shiftTemplates).orderBy(asc(shiftTemplates.name))
      ).map((row) => ({ id: row.id, ...snapshot(row) }));
    },
    saveTemplate(input: ShiftTemplateInput, id?: string) {
      return mutate(async (tx) => {
        const value = normalizeTemplate(input);
        const [before] = id
          ? await tx
              .select()
              .from(shiftTemplates)
              .where(eq(shiftTemplates.id, id))
          : [];
        if (id && !before)
          fail('Plantilla no encontrada.', 'PLANNING_NOT_FOUND', 404);
        const [row] = id
          ? await tx
              .update(shiftTemplates)
              .set({ ...value, version: before!.version + 1 })
              .where(eq(shiftTemplates.id, id))
              .returning()
          : await tx.insert(shiftTemplates).values(value).returning();
        if (!row) throw new Error('No se guardó plantilla.');
        await recordAudit(tx, {
          action: id ? 'planning.template.update' : 'planning.template.create',
          entityType: 'shiftTemplate',
          entityId: row.id,
          before: before ? snapshot(before) : null,
          after: snapshot(row),
        });
        return { id: row.id, ...snapshot(row) };
      });
    },
    deleteTemplate(id: string) {
      return mutate(async (tx) => {
        const [before] = await tx
          .select()
          .from(shiftTemplates)
          .where(eq(shiftTemplates.id, id));
        if (!before)
          fail('Plantilla no encontrada.', 'PLANNING_NOT_FOUND', 404);
        await tx.delete(shiftTemplates).where(eq(shiftTemplates.id, id));
        await recordAudit(tx, {
          action: 'planning.template.delete',
          entityType: 'shiftTemplate',
          entityId: id,
          before: snapshot(before),
        });
      });
    },
    async listHolidays() {
      return db.select().from(holidays).orderBy(asc(holidays.date));
    },
    syncOfficialHolidays() {
      return mutate(async (tx) => {
        await assertOrganizationAdministrator(tx);
        const actorId = getAuditContext()?.actorId;
        const [actor] = actorId
          ? await tx
              .select({ id: users.id })
              .from(users)
              .innerJoin(userRoles, eq(userRoles.userId, users.id))
              .where(
                and(
                  eq(users.id, actorId),
                  eq(users.active, true),
                  eq(userRoles.role, 'SUPER_ADMIN'),
                ),
              )
              .limit(1)
          : [];
        if (!actor)
          fail(
            'La carga oficial requiere un SUPER_ADMIN activo identificado en la auditoría.',
            'SUPER_ADMIN_REQUIRED',
            403,
          );
        let created = 0,
          unchanged = 0;
        for (const desired of OFFICIAL_HOLIDAYS) {
          const [existing] = await tx
            .select()
            .from(holidays)
            .where(eq(holidays.date, desired.date));
          if (existing) {
            if (existing.name !== desired.name)
              fail(
                `La fecha ${desired.date} ya tiene otro contenido; revisa el calendario antes de sustituirlo.`,
                'OFFICIAL_CALENDAR_CONFLICT',
                409,
              );
            unchanged++;
          } else {
            const [row] = await tx.insert(holidays).values(desired).returning();
            await recordAudit(tx, {
              action: 'planning.official_holiday.created',
              entityType: 'holiday',
              entityId: row!.id,
              after: { ...desired, sources: OFFICIAL_CALENDAR_SOURCES },
            });
            created++;
          }
        }
        if (created)
          await recordAudit(tx, {
            action: 'planning.official_calendar.loaded',
            entityType: 'official_calendar',
            entityId: '81211000-0000-4000-8000-000000002627',
            after: {
              calendarKey: 'mx-2026-2027',
              created,
              unchanged,
              sources: OFFICIAL_CALENDAR_SOURCES,
            },
          });
        return { created, unchanged };
      });
    },
    saveHoliday(input: HolidayInput, id?: string) {
      return mutate(async (tx) => {
        civilDate(input.date);
        const name = input.name.normalize('NFC').trim();
        if (!name || name.length > 150 || name.includes('\u0000'))
          fail('Indica un nombre de hasta 150 caracteres.');
        const [before] = id
          ? await tx.select().from(holidays).where(eq(holidays.id, id))
          : [];
        if (id && !before)
          fail('Festivo no encontrado.', 'PLANNING_NOT_FOUND', 404);
        const [row] = id
          ? await tx
              .update(holidays)
              .set({ name, date: input.date })
              .where(eq(holidays.id, id))
              .returning()
          : await tx
              .insert(holidays)
              .values({ name, date: input.date })
              .returning();
        if (!row) throw new Error('No se guardó festivo.');
        await recordAudit(tx, {
          action: id ? 'planning.holiday.update' : 'planning.holiday.create',
          entityType: 'holiday',
          entityId: row.id,
          before: before ?? null,
          after: row,
        });
        return row;
      });
    },
    deleteHoliday(id: string) {
      return mutate(async (tx) => {
        const [before] = await tx
          .delete(holidays)
          .where(eq(holidays.id, id))
          .returning();
        if (!before) fail('Festivo no encontrado.', 'PLANNING_NOT_FOUND', 404);
        await recordAudit(tx, {
          action: 'planning.holiday.delete',
          entityType: 'holiday',
          entityId: id,
          before,
        });
      });
    },
    async listAssignments(from: string, to: string, scope: SessionView) {
      validateCalendarRange(from, to);
      const filter = scope.permissions.viewAllEmployees
        ? undefined
        : or(
            eq(
              employees.id,
              scope.employeeId ?? '00000000-0000-0000-0000-000000000000',
            ),
            inArray(employees.departmentId, scope.managedDepartmentIds),
          );
      return (
        await db
          .select({ slot: scheduleAssignments })
          .from(scheduleAssignments)
          .innerJoin(
            employees,
            eq(employees.id, scheduleAssignments.employeeId),
          )
          .where(
            and(
              gte(scheduleAssignments.workDate, from),
              lte(scheduleAssignments.workDate, to),
              filter,
            ),
          )
          .orderBy(
            asc(scheduleAssignments.startsAt),
            asc(scheduleAssignments.id),
          )
      ).map((row) => row.slot);
    },
    saveAssignment(input: ScheduleAssignmentInput, id?: string) {
      return mutate(async (tx) => {
        const before = id ? await getSlot(tx, id) : null;
        if (before && before.status !== 'DRAFT')
          fail(
            'Solo puedes editar borradores. Cancela el publicado para reemplazarlo.',
            'PLANNING_CONFLICT',
            409,
          );
        const value = await validateSlot(tx, input, id);
        const [row] = id
          ? await tx
              .update(scheduleAssignments)
              .set(value)
              .where(eq(scheduleAssignments.id, id))
              .returning()
          : await tx.insert(scheduleAssignments).values(value).returning();
        if (!row) throw new Error('No se guardó asignación.');
        await recordAudit(tx, {
          action: id
            ? 'planning.assignment.update'
            : 'planning.assignment.create',
          entityType: 'scheduleAssignment',
          entityId: row.id,
          before,
          after: row,
        });
        return row;
      });
    },
    publishAssignment(id: string) {
      return mutate(async (tx) => {
        const before = await getSlot(tx, id);
        if (before.status !== 'DRAFT')
          fail('Solo puedes publicar borradores.', 'PLANNING_CONFLICT', 409);
        const [currentTemplate] = await tx
          .select()
          .from(shiftTemplates)
          .where(eq(shiftTemplates.id, before.templateId));
        if (!currentTemplate?.active) fail('La plantilla ya no está activa.');
        const frozen = {
          ...before.snapshot,
          id: before.templateId,
          defaultKey: null,
        };
        await validateSlot(tx, before, id, frozen);
        if (await getApprovedCoverage(tx, before))
          fail(
            'El empleado tiene una ausencia aprobada para ese turno.',
            'APPROVED_LEAVE_CONFLICT',
            409,
          );
        const [row] = await tx
          .update(scheduleAssignments)
          .set({ status: 'PUBLISHED', publishedAt: new Date() })
          .where(eq(scheduleAssignments.id, id))
          .returning();
        if (!row) throw new Error('No se publicó asignación.');
        await notify(
          tx,
          before,
          row,
          'planning.assignment.publish',
          'Horario publicado',
        );
        return row;
      });
    },
    cancelAssignment(id: string, reason: string) {
      return mutate(async (tx) => {
        const before = await getSlot(tx, id);
        const [attendance] = await tx
          .select({ id: attendanceSessions.id })
          .from(attendanceSessions)
          .where(eq(attendanceSessions.assignmentId, id))
          .limit(1);
        if (attendance)
          fail(
            'El turno conserva historial de asistencia y no puede cancelarse.',
            'ATTENDANCE_STARTED',
            409,
          );
        if (before.status === 'CANCELLED')
          fail('La asignación ya está cancelada.', 'PLANNING_CONFLICT', 409);
        const text = reason.normalize('NFC').trim();
        if (!text || text.length > 500 || text.includes('\u0000'))
          fail('Indica un motivo de hasta 500 caracteres.');
        const [row] = await tx
          .update(scheduleAssignments)
          .set({
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: text,
          })
          .where(eq(scheduleAssignments.id, id))
          .returning();
        if (!row) throw new Error('No se canceló asignación.');
        await notify(
          tx,
          before,
          row,
          'planning.assignment.cancel',
          'Horario cancelado',
        );
        return row;
      });
    },
  };
}
async function notify(
  tx: Executor,
  before: typeof scheduleAssignments.$inferSelect,
  after: typeof scheduleAssignments.$inferSelect,
  action: string,
  title: string,
) {
  const eventId = await recordAudit(tx, {
    action,
    entityType: 'scheduleAssignment',
    entityId: after.id,
    before,
    after,
  });
  const [employee] = await tx
    .select({ userId: employees.userId })
    .from(employees)
    .where(eq(employees.id, after.employeeId));
  if (employee?.userId)
    await enqueueNotifications(tx, {
      eventId,
      recipientIds: [employee.userId],
      title,
      message: `${after.templateName}: ${after.workDate}.`,
      href: '/calendario',
    });
}
export type PlanningService = ReturnType<typeof createPlanningService>;
