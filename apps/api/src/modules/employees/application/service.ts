import { recordAudit } from '../../audit/index.js';
import { and, asc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type {
  AssignmentInput,
  EmployeeCreateInput,
  SessionView,
} from '@asistencia/contracts';
import type { Database } from '../../../infrastructure/database/client.js';
import { departments } from '../../departments/schema.js';
import { users } from '../../identity/schema.js';
import {
  disableAccountForEmployee,
  assertCanManageProtectedAccount,
  assertOrganizationAdministrator,
} from '../../identity/index.js';
import { generateEmployeeNumber } from '../infrastructure/employee-numbers.js';
import { employees, assignments } from '../infrastructure/schema.js';
import {
  normalizeEmployeeInput,
  OrganizationError,
  type EmployeeInput,
  type OrganizationScope,
} from '../domain/employee.js';

type Executor = Pick<
  Database,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;
type Assignment = typeof assignments.$inferSelect;
function fail(message: string, code = 'INVALID_EMPLOYEE'): never {
  throw new OrganizationError(code, message);
}
async function lock(tx: Executor) {
  await tx.execute(sql`select pg_advisory_xact_lock(81209002)`);
  await assertOrganizationAdministrator(tx);
}
function visible(scope: SessionView) {
  return scope.permissions.viewAllEmployees
    ? undefined
    : or(
        eq(
          employees.id,
          scope.employeeId ?? '00000000-0000-0000-0000-000000000000',
        ),
        inArray(employees.departmentId, scope.managedDepartmentIds),
      );
}
async function closeAssignments(tx: Executor, rows: Assignment[], now: Date) {
  if (!rows.length) return;
  const ids = rows.map((row) => row.id);
  const dependent = await tx
    .select()
    .from(assignments)
    .where(
      and(
        inArray(assignments.sourceAssignmentId, ids),
        isNull(assignments.revokedAt),
      ),
    );
  for (const row of [...rows, ...dependent]) {
    const [owner] = await tx
      .select({ userId: employees.userId })
      .from(employees)
      .where(eq(employees.id, row.employeeId));
    if (owner?.userId) await assertCanManageProtectedAccount(tx, owner.userId);
  }
  for (const row of rows)
    await recordAudit(tx, {
      action: 'RESPONSIBILITY_CLOSED',
      entityType: 'responsibility',
      entityId: row.id,
      before: row,
      after: { endsAt: now.toISOString(), dependentSubstitutesRevoked: true },
    });
  await tx
    .update(assignments)
    .set({
      endsAt: sql`greatest(${now.toISOString()}::timestamptz, ${assignments.startsAt} + interval '1 millisecond')`,
    })
    .where(inArray(assignments.id, ids));
  await tx
    .update(assignments)
    .set({ revokedAt: now })
    .where(
      and(
        inArray(assignments.sourceAssignmentId, ids),
        isNull(assignments.revokedAt),
      ),
    );
}
function translate(error: unknown): never {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error && 'code' in cause) {
    if (cause.code === '23505')
      fail(
        'El número interno o el usuario ya están vinculados a otro empleado.',
        'EMPLOYEE_CONFLICT',
      );
    if (cause.code === '23503')
      fail('Una referencia del expediente no está disponible.');
  }
  throw error;
}
export function createEmployeeService(db: Database) {
  async function validateReferences(
    tx: Executor,
    input: EmployeeInput,
    id?: string,
  ) {
    if (
      !(
        await tx
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.id, input.departmentId))
      ).length
    )
      fail('Departamento no encontrado.');
    if (input.userId) {
      const [account] = await tx
        .select({ active: users.active })
        .from(users)
        .where(eq(users.id, input.userId));
      // Una cuenta inactiva ya vinculada puede conservarse al editar un expediente.
      const [previous] = id
        ? await tx
            .select({ userId: employees.userId })
            .from(employees)
            .where(eq(employees.id, id))
        : [];
      if (!account || (!account.active && previous?.userId !== input.userId))
        fail('Selecciona un usuario activo disponible.');
    }
    if (input.supervisorId) {
      if (input.supervisorId === id)
        fail('Un empleado no puede ser su propio superior.');
      const [supervisor] = await tx
        .select()
        .from(employees)
        .where(eq(employees.id, input.supervisorId));
      if (!supervisor || supervisor.status !== 'ACTIVE')
        fail('El superior debe ser un empleado activo.');
      if (id) {
        const chain = await tx.execute(
          sql`with recursive chain as (select id, supervisor_id from employees where id = ${input.supervisorId}::uuid union select e.id, e.supervisor_id from employees e join chain c on e.id = c.supervisor_id) select id from chain where id = ${id}::uuid`,
        );
        if (chain.rows.length)
          fail(
            'La asignación produciría un ciclo de superiores.',
            'EMPLOYEE_CONFLICT',
          );
      }
    }
  }
  async function save(input: EmployeeCreateInput, id?: string) {
    try {
      return await db.transaction(async (tx) => {
        await lock(tx);
        const normalized = normalizeEmployeeInput({
          ...input,
          employeeNumber:
            input.employeeNumber ?? (await generateEmployeeNumber(tx)),
        });
        await validateReferences(tx, normalized, id);
        const [previous] = id
          ? await tx.select().from(employees).where(eq(employees.id, id))
          : [];
        if (id && !previous)
          fail('Empleado no encontrado.', 'EMPLOYEE_NOT_FOUND');
        for (const accountId of new Set(
          [previous?.userId, normalized.userId].filter(
            (value): value is string => Boolean(value),
          ),
        ))
          await assertCanManageProtectedAccount(tx, accountId);
        // Desactivar primero la cuenta dentro de la misma transacción protege al último ADMIN.
        if (normalized.status === 'INACTIVE') {
          const linkedAccounts = new Set(
            [previous?.userId, normalized.userId].filter((id): id is string =>
              Boolean(id),
            ),
          );
          for (const userId of linkedAccounts)
            await disableAccountForEmployee(tx, userId);
        }
        const [row] = id
          ? await tx
              .update(employees)
              .set({ ...normalized, updatedAt: new Date() })
              .where(eq(employees.id, id))
              .returning()
          : await tx.insert(employees).values(normalized).returning();
        if (!row) throw new Error('No se pudo guardar el expediente.');
        if (
          previous &&
          (normalized.status === 'INACTIVE' ||
            previous.departmentId !== normalized.departmentId)
        ) {
          const current = await tx
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.employeeId, row.id),
                isNull(assignments.revokedAt),
                or(
                  isNull(assignments.endsAt),
                  gt(assignments.endsAt, new Date()),
                ),
              ),
            );
          const incompatible = current.filter(
            (a) => normalized.status === 'INACTIVE' || a.kind === 'HEAD',
          );
          const heads = incompatible.filter((a) => a.kind !== 'SUBSTITUTE');
          await closeAssignments(tx, heads, new Date());
          const substitutes = incompatible.filter(
            (a) => a.kind === 'SUBSTITUTE',
          );
          if (substitutes.length)
            await tx
              .update(assignments)
              .set({ revokedAt: new Date() })
              .where(
                inArray(
                  assignments.id,
                  substitutes.map((a) => a.id),
                ),
              );
        }
        await recordAudit(tx, {
          action: id ? 'EMPLOYEE_UPDATED' : 'EMPLOYEE_CREATED',
          entityType: 'employee',
          entityId: row.id,
          before: previous ?? null,
          after: row,
        });
        return row;
      });
    } catch (error) {
      return translate(error);
    }
  }
  return {
    create: (input: EmployeeCreateInput) => save(input),
    update: (id: string, input: EmployeeInput) => save(input, id),
    async delete(id: string): Promise<void> {
      try {
        await db.transaction(async (tx) => {
          await lock(tx);
          const [record] = await tx
            .select()
            .from(employees)
            .where(eq(employees.id, id));
          if (!record) fail('Empleado no encontrado.', 'EMPLOYEE_NOT_FOUND');
          if (record.userId) await disableAccountForEmployee(tx, record.userId);
          await tx.delete(employees).where(eq(employees.id, id));
          await recordAudit(tx, {
            action: 'EMPLOYEE_DELETED',
            entityType: 'employee',
            entityId: id,
            before: record,
          });
        });
      } catch (error) {
        const cause = error instanceof Error ? error.cause : undefined;
        if (cause instanceof Error && 'code' in cause && cause.code === '23503')
          fail(
            'El empleado tiene historial o registros vinculados. Inactiva el expediente para conservar su historial.',
            'EMPLOYEE_IN_USE',
          );
        throw error;
      }
    },
    async list(scope: SessionView) {
      return db
        .select()
        .from(employees)
        .where(visible(scope))
        .orderBy(asc(employees.fullName), asc(employees.id));
    },
    async get(id: string, scope: SessionView) {
      const [row] = await db
        .select()
        .from(employees)
        .where(and(eq(employees.id, id), visible(scope)));
      if (!row) fail('Empleado no encontrado.', 'EMPLOYEE_NOT_FOUND');
      return row;
    },
    async scopeFor(userId: string): Promise<OrganizationScope> {
      const [employee] = await db
        .select()
        .from(employees)
        .where(
          and(eq(employees.userId, userId), eq(employees.status, 'ACTIVE')),
        );
      if (!employee)
        return {
          employeeId: null,
          departmentIds: [],
          managedDepartmentIds: [],
          isDirector: false,
        };
      const now = new Date();
      const current = await db
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.employeeId, employee.id),
            lte(assignments.startsAt, now),
            or(isNull(assignments.endsAt), gt(assignments.endsAt, now)),
            isNull(assignments.revokedAt),
          ),
        );
      const sourceIds = current
        .filter((a) => a.kind === 'SUBSTITUTE' && a.sourceAssignmentId)
        .map((a) => a.sourceAssignmentId as string);
      const sources = sourceIds.length
        ? await db
            .select({ assignment: assignments, employee: employees })
            .from(assignments)
            .innerJoin(employees, eq(assignments.employeeId, employees.id))
            .where(
              and(
                inArray(assignments.id, sourceIds),
                eq(assignments.kind, 'HEAD'),
                isNull(assignments.endsAt),
                isNull(assignments.revokedAt),
                lte(assignments.startsAt, now),
                eq(employees.status, 'ACTIVE'),
              ),
            )
        : [];
      const validSources = new Set(
        sources
          .filter((a) => a.assignment.departmentId === a.employee.departmentId)
          .map((a) => a.assignment.id),
      );
      const managed = current
        .filter(
          (a) =>
            (a.kind === 'HEAD' &&
              a.endsAt === null &&
              a.departmentId === employee.departmentId) ||
            (a.kind === 'SUBSTITUTE' &&
              a.sourceAssignmentId &&
              validSources.has(a.sourceAssignmentId)),
        )
        .map((a) => a.departmentId as string);
      return {
        employeeId: employee.id,
        departmentIds: [...new Set([employee.departmentId, ...managed])],
        managedDepartmentIds: [...new Set(managed)],
        isDirector: current.some(
          (a) => a.kind === 'DIRECTOR' && a.endsAt === null,
        ),
      };
    },
    async listAssignments(scope: SessionView) {
      const filter = scope.permissions.viewAllEmployees
        ? undefined
        : or(
            eq(
              assignments.employeeId,
              scope.employeeId ?? '00000000-0000-0000-0000-000000000000',
            ),
            inArray(assignments.departmentId, scope.managedDepartmentIds),
          );
      return db
        .select()
        .from(assignments)
        .where(filter)
        .orderBy(asc(assignments.startsAt), asc(assignments.id));
    },
    async assign(input: AssignmentInput, actorId: string) {
      return db.transaction(async (tx) => {
        await lock(tx);
        const reason = input.reason.normalize('NFC').trim();
        if (
          !reason ||
          Array.from(reason).length > 250 ||
          reason.includes('\u0000')
        )
          fail(
            'Indica un motivo de hasta 250 caracteres.',
            'INVALID_ASSIGNMENT',
          );
        const [employee] = await tx
          .select()
          .from(employees)
          .where(eq(employees.id, input.employeeId));
        if (!employee || employee.status !== 'ACTIVE')
          fail('Selecciona un empleado activo.', 'INVALID_ASSIGNMENT');
        if (employee.userId)
          await assertCanManageProtectedAccount(tx, employee.userId);
        const now = new Date();
        if (
          input.kind === 'DIRECTOR'
            ? input.departmentId !== null
            : !input.departmentId
        )
          fail(
            'Departamento incompatible con el tipo de responsabilidad.',
            'INVALID_ASSIGNMENT',
          );
        if (
          input.departmentId &&
          !(
            await tx
              .select()
              .from(departments)
              .where(eq(departments.id, input.departmentId))
          ).length
        )
          fail('Departamento no disponible.', 'INVALID_ASSIGNMENT');
        if (input.kind === 'SUBSTITUTE') {
          const startsAt = input.startsAt
            ? new Date(input.startsAt)
            : new Date(NaN);
          const endsAt = input.endsAt ? new Date(input.endsAt) : new Date(NaN);
          if (
            !Number.isFinite(startsAt.getTime()) ||
            !Number.isFinite(endsAt.getTime()) ||
            endsAt <= startsAt
          )
            fail(
              'La suplencia requiere inicio y fin válidos, con fin posterior al inicio.',
              'INVALID_ASSIGNMENT',
            );
          const [source] = await tx
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.kind, 'HEAD'),
                eq(assignments.departmentId, input.departmentId as string),
                isNull(assignments.endsAt),
                isNull(assignments.revokedAt),
                lte(assignments.startsAt, now),
              ),
            );
          if (!source || source.employeeId === employee.id)
            fail(
              'Se requiere una jefatura vigente y un suplente diferente.',
              'INVALID_ASSIGNMENT',
            );
          const [sourceEmployee] = await tx
            .select()
            .from(employees)
            .where(eq(employees.id, source.employeeId));
          if (
            !sourceEmployee ||
            sourceEmployee.status !== 'ACTIVE' ||
            sourceEmployee.departmentId !== input.departmentId
          )
            fail(
              'La jefatura titular no está disponible.',
              'INVALID_ASSIGNMENT',
            );
          const overlaps = await tx
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.kind, 'SUBSTITUTE'),
                eq(assignments.employeeId, employee.id),
                eq(assignments.departmentId, input.departmentId as string),
                isNull(assignments.revokedAt),
                gt(assignments.endsAt, startsAt),
                sql`${assignments.startsAt} < ${endsAt.toISOString()}::timestamptz`,
              ),
            );
          if (overlaps.length)
            fail(
              'La suplencia se superpone con otra vigente.',
              'ASSIGNMENT_CONFLICT',
            );
          const [row] = await tx
            .insert(assignments)
            .values({
              kind: input.kind,
              employeeId: employee.id,
              departmentId: input.departmentId,
              startsAt,
              endsAt,
              sourceAssignmentId: source.id,
              reason,
              createdBy: actorId,
            })
            .returning();
          if (!row) throw new Error('No se pudo crear la suplencia.');
          await recordAudit(tx, {
            action: 'RESPONSIBILITY_ASSIGNED',
            entityType: 'responsibility',
            entityId: row.id,
            after: row,
            actorId,
          });
          return row;
        }
        if (input.startsAt !== undefined || input.endsAt != null)
          fail(
            'Jefatura y dirección se asignan con efecto inmediato.',
            'INVALID_ASSIGNMENT',
          );
        if (
          input.kind === 'HEAD' &&
          employee.departmentId !== input.departmentId
        )
          fail(
            'El titular debe pertenecer al departamento.',
            'INVALID_ASSIGNMENT',
          );
        const existing = await tx
          .select()
          .from(assignments)
          .where(
            and(
              eq(assignments.kind, input.kind),
              input.kind === 'HEAD'
                ? eq(assignments.departmentId, input.departmentId as string)
                : isNull(assignments.departmentId),
              isNull(assignments.endsAt),
              isNull(assignments.revokedAt),
            ),
          );
        await closeAssignments(tx, existing, now);
        const [row] = await tx
          .insert(assignments)
          .values({
            kind: input.kind,
            employeeId: employee.id,
            departmentId: input.departmentId,
            startsAt: now,
            reason,
            createdBy: actorId,
          })
          .returning();
        if (!row) throw new Error('No se pudo asignar responsable.');
        await recordAudit(tx, {
          action: 'RESPONSIBILITY_ASSIGNED',
          entityType: 'responsibility',
          entityId: row.id,
          after: row,
          actorId,
        });
        return row;
      });
    },
    async revokeAssignment(id: string) {
      await db.transaction(async (tx) => {
        await lock(tx);
        const [row] = await tx
          .select()
          .from(assignments)
          .where(eq(assignments.id, id));
        if (!row) fail('Asignación no encontrada.', 'EMPLOYEE_NOT_FOUND');
        const [owner] = await tx
          .select({ userId: employees.userId })
          .from(employees)
          .where(eq(employees.id, row.employeeId));
        if (owner?.userId)
          await assertCanManageProtectedAccount(tx, owner.userId);
        if (row.revokedAt) return;
        if (row.kind !== 'SUBSTITUTE' && row.endsAt === null)
          await closeAssignments(tx, [row], new Date());
        await tx
          .update(assignments)
          .set({ revokedAt: new Date() })
          .where(eq(assignments.id, id));
        const [updated] = await tx
          .select()
          .from(assignments)
          .where(eq(assignments.id, id));
        await recordAudit(tx, {
          action: 'RESPONSIBILITY_REVOKED',
          entityType: 'responsibility',
          entityId: id,
          before: row,
          after: updated ?? null,
        });
      });
    },
  };
}
export type EmployeeService = ReturnType<typeof createEmployeeService>;
