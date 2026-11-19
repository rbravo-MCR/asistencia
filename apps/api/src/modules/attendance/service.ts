import { randomUUID, createHash } from 'node:crypto';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import type {
  AttendancePolicyInput,
  AttendancePolicyView,
  AttendancePunchInput,
  AttendancePunchResult,
  AttendanceIncidentView,
  AttendanceSummaryItem,
  SessionView,
} from '@asistencia/contracts';
import type { Database } from '../../infrastructure/database/client.js';
import { employees, assignments } from '../employees/schema.js';
import { users, userRoles } from '../identity/schema.js';
import { scheduleAssignments } from '../planning/schema.js';
import { recordAudit, enqueueNotifications } from '../audit/index.js';
import { recordLocationCheck } from '../locations/index.js';
import {
  getApprovedCoverage,
  getIncidentResolution,
} from '../requests/index.js';
import {
  attendancePolicies as policies,
  attendanceSessions as sessions,
  attendanceAttempts as attempts,
  attendanceIncidents as incidents,
  attendanceReasons as reasons,
  attendanceEvaluations as evaluations,
} from './schema.js';
import { classifyPunch, fail, omission, validateRange } from './domain.js';
type Executor = Pick<Database, 'select' | 'insert' | 'update' | 'execute'>;
type Slot = typeof scheduleAssignments.$inferSelect;
type Control = typeof sessions.$inferSelect;
async function lock(tx: Executor) {
  await tx.execute(sql`select pg_advisory_xact_lock(81209002)`);
  await tx.execute(sql`select pg_advisory_xact_lock(81213001)`);
}
const policyView = (p: typeof policies.$inferSelect): AttendancePolicyView => ({
  id: p.id,
  version: p.version,
  lateToleranceMinutes: p.lateToleranceMinutes,
  earlyEntryMinutes: p.earlyEntryMinutes,
  lateExitMinutes: p.lateExitMinutes,
  administrativeAbsenceMinutes: p.administrativeAbsenceMinutes,
  activatedAt: p.activatedAt.toISOString(),
  createdAt: p.createdAt.toISOString(),
});
export async function initializeAttendancePolicy(tx: Executor) {
  await lock(tx);
  await tx
    .insert(policies)
    .values({
      version: 1,
      lateToleranceMinutes: 10,
      earlyEntryMinutes: 30,
      lateExitMinutes: 120,
      activatedAt: new Date(),
    })
    .onConflictDoNothing();
}
async function latestPolicy(tx: Executor) {
  const [p] = await tx
    .select()
    .from(policies)
    .orderBy(desc(policies.version))
    .limit(1);
  if (!p)
    fail(
      'POLICY_REQUIRED',
      'La política de asistencia aún no está habilitada.',
      503,
    );
  return p;
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
function reasonText(value: string) {
  const v = value.normalize('NFC').trim();
  if (!v || v.length > 2000 || v.includes('\0'))
    fail('INVALID_REASON', 'Indica un motivo de hasta 2000 caracteres.');
  return v;
}
const attemptView = (a: typeof attempts.$inferSelect) => ({
  id: a.id,
  sessionId: a.sessionId,
  assignmentId: a.assignmentId,
  employeeId: a.employeeId,
  direction: a.direction,
  recordedAt: a.recordedAt.toISOString(),
  accepted: a.accepted,
  rejectionCode: a.rejectionCode,
  geoCheckId: a.geoCheckId,
});
async function incidentView(
  tx: Executor,
  i: typeof incidents.$inferSelect,
): Promise<AttendanceIncidentView> {
  const rr = await tx
    .select()
    .from(reasons)
    .where(eq(reasons.incidentId, i.id))
    .orderBy(asc(reasons.createdAt), asc(reasons.id));
  const resolution = await getIncidentResolution(tx, i.id);
  return {
    id: i.id,
    sessionId: i.sessionId,
    assignmentId: i.assignmentId,
    employeeId: i.employeeId,
    kind: i.kind,
    createdAt: i.createdAt.toISOString(),
    requiresReason: rr.length === 0 && !resolution,
    resolution,
    reasons: rr.map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
export function createAttendanceService(
  db: Database,
  options: { clock?: () => Date } = {},
) {
  const clock = options.clock ?? (() => new Date());
  async function control(
    tx: Executor,
    slot: Slot,
    now: Date,
  ): Promise<Control> {
    const [existing] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.assignmentId, slot.id));
    if (existing) return existing;
    const [row] = await tx
      .insert(sessions)
      .values({
        assignmentId: slot.id,
        employeeId: slot.employeeId,
        policySnapshot: policyView(await latestPolicy(tx)),
        createdAt: now,
      })
      .returning();
    return row!;
  }
  async function notify(
    tx: Executor,
    eventId: string,
    employeeId: string,
    now: Date,
  ) {
    const [employee] = await tx
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId));
    if (!employee) return;
    const responsible = await tx
      .select({ userId: employees.userId })
      .from(assignments)
      .innerJoin(employees, eq(employees.id, assignments.employeeId))
      .where(
        and(
          eq(employees.status, 'ACTIVE'),
          isNull(assignments.revokedAt),
          lte(assignments.startsAt, now),
          or(isNull(assignments.endsAt), gte(assignments.endsAt, now)),
          or(
            eq(assignments.kind, 'DIRECTOR'),
            eq(assignments.departmentId, employee.departmentId),
          ),
        ),
      );
    const hr = await tx
      .select({ userId: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .where(
        and(
          eq(users.active, true),
          inArray(userRoles.role, ['SUPER_ADMIN', 'ADMIN', 'HR']),
        ),
      );
    await enqueueNotifications(tx, {
      eventId,
      recipientIds: [
        employee.userId,
        ...responsible.map((r) => r.userId),
        ...hr.map((r) => r.userId),
      ].filter((id): id is string => id !== null),
      title: 'Asistencia registrada',
      message: 'Hay una actualización de asistencia para consultar.',
      href: '/incidencias',
    });
  }
  async function addReason(
    tx: Executor,
    i: typeof incidents.$inferSelect,
    text: string,
    actorId: string,
    now: Date,
  ) {
    const [row] = await tx
      .insert(reasons)
      .values({
        incidentId: i.id,
        reason: reasonText(text),
        createdAt: now,
        createdBy: actorId,
      })
      .returning();
    const eventId = await recordAudit(tx, {
      action: 'attendance.reason.added',
      entityType: 'attendance_incident',
      entityId: i.id,
      actorId,
      after: { reasonId: row!.id },
    });
    await notify(tx, eventId, i.employeeId, now);
  }
  async function addIncident(
    tx: Executor,
    c: Control,
    kind: string,
    key: string,
    now: Date,
    actorId: string | null,
    attemptId?: string,
    reason?: string,
  ) {
    const [row] = await tx
      .insert(incidents)
      .values({
        sessionId: c.id,
        assignmentId: c.assignmentId,
        employeeId: c.employeeId,
        kind,
        dedupeKey: key,
        createdAt: now,
        attemptId,
      })
      .onConflictDoNothing()
      .returning();
    if (!row) return null;
    if (reason && actorId) await addReason(tx, row, reason, actorId, now);
    const event = await recordAudit(tx, {
      action: 'attendance.incident.created',
      entityType: 'attendance_incident',
      entityId: row.id,
      actorId,
      after: { employeeId: c.employeeId, kind, assignmentId: c.assignmentId },
    });
    await notify(tx, event, c.employeeId, now);
    return row;
  }
  async function list(
    from: string,
    to: string,
    scope: SessionView,
  ): Promise<AttendanceSummaryItem[]> {
    validateRange(from, to);
    const slots = await db
      .select({ slot: scheduleAssignments, employee: employees })
      .from(scheduleAssignments)
      .innerJoin(employees, eq(employees.id, scheduleAssignments.employeeId))
      .where(
        and(
          gte(scheduleAssignments.workDate, from),
          lte(scheduleAssignments.workDate, to),
          inArray(scheduleAssignments.status, ['PUBLISHED', 'CANCELLED']),
          visible(scope),
        ),
      )
      .orderBy(asc(scheduleAssignments.startsAt));
    const result: AttendanceSummaryItem[] = [];
    for (const { slot, employee } of slots) {
      const [c] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.assignmentId, slot.id));
      if (slot.status === 'CANCELLED' && !c) continue;
      const aa = c
        ? await db
            .select()
            .from(attempts)
            .where(eq(attempts.sessionId, c.id))
            .orderBy(asc(attempts.recordedAt), asc(attempts.id))
        : [];
      const ii = c
        ? await db
            .select()
            .from(incidents)
            .where(eq(incidents.sessionId, c.id))
            .orderBy(asc(incidents.createdAt), asc(incidents.id))
        : [];
      const ee = c
        ? await db
            .select()
            .from(evaluations)
            .where(eq(evaluations.sessionId, c.id))
            .orderBy(asc(evaluations.evaluatedAt))
        : [];
      result.push({
        assignmentId: slot.id,
        employeeId: employee.id,
        employeeName: employee.fullName,
        workDate: slot.workDate,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        modality: slot.modality,
        timeZone: slot.timeZone,
        status: slot.status,
        sessionId: c?.id ?? null,
        policy: c?.policySnapshot ?? null,
        attempts: aa.map(attemptView),
        incidents: await Promise.all(ii.map((i) => incidentView(db, i))),
        evaluations: ee.map((e) => ({
          id: e.id,
          evaluatedAt: e.evaluatedAt.toISOString(),
          result: e.result,
        })),
        summary:
          ee.at(-1)?.result ??
          (aa.some((a) => a.accepted && a.direction === 'ENTRY') &&
          aa.some((a) => a.accepted && a.direction === 'EXIT')
            ? 'COMPLETE'
            : 'OPEN'),
      });
    }
    return result;
  }
  async function evaluate(
    from?: string,
    to?: string,
    actorId: string | null = null,
  ) {
    if (from && to) validateRange(from, to);
    return db.transaction(async (tx) => {
      await lock(tx);
      const now = clock();
      const [initial] = await tx
        .select()
        .from(policies)
        .orderBy(asc(policies.version))
        .limit(1);
      if (!initial) return { evaluated: 0 };
      const latest = await latestPolicy(tx);
      const slots = await tx
        .select({ slot: scheduleAssignments })
        .from(scheduleAssignments)
        .leftJoin(sessions, eq(sessions.assignmentId, scheduleAssignments.id))
        .leftJoin(evaluations, eq(evaluations.sessionId, sessions.id))
        .where(
          and(
            eq(scheduleAssignments.status, 'PUBLISHED'),
            isNull(evaluations.id),
            or(
              gte(scheduleAssignments.startsAt, initial.activatedAt),
              sql`${sessions.id} is not null`,
            ),
            from ? gte(scheduleAssignments.workDate, from) : undefined,
            to ? lte(scheduleAssignments.workDate, to) : undefined,
            sql`${scheduleAssignments.endsAt} + (coalesce((${sessions.policySnapshot}->>'lateExitMinutes')::int,${latest.lateExitMinutes}) * interval '1 minute') < ${now}`,
          ),
        )
        .orderBy(asc(scheduleAssignments.endsAt))
        .limit(from ? 2147483647 : 100);
      let evaluated = 0;
      for (const { slot } of slots) {
        const [existing] = await tx
          .select()
          .from(sessions)
          .where(eq(sessions.assignmentId, slot.id));
        if (!existing && slot.startsAt < initial.activatedAt) continue;
        const policy =
          existing?.policySnapshot ?? policyView(await latestPolicy(tx));
        if (
          now.getTime() <=
          slot.endsAt.getTime() + policy.lateExitMinutes * 60000
        )
          continue;
        const c = existing ?? (await control(tx, slot, now));
        const [done] = await tx
          .select()
          .from(evaluations)
          .where(eq(evaluations.sessionId, c.id));
        if (done) continue;
        const aa = await tx
          .select()
          .from(attempts)
          .where(
            and(eq(attempts.sessionId, c.id), eq(attempts.accepted, true)),
          );
        const coverage = await getApprovedCoverage(tx, slot);
        const actualResult = omission(
          aa.some((a) => a.direction === 'ENTRY'),
          aa.some((a) => a.direction === 'EXIT'),
        );
        const result =
          coverage && actualResult !== 'COMPLETE'
            ? 'AUTHORIZED_ABSENCE'
            : aa.some(
                  (a) =>
                    a.direction === 'ENTRY' &&
                    classifyPunch(
                      'ENTRY',
                      a.recordedAt,
                      { ...slot, category: slot.snapshot.category },
                      c.policySnapshot,
                    ).incident === 'LATE_ABSENCE',
                )
              ? 'LATE_ABSENCE'
              : actualResult;
        const [evaluation] = await tx
          .insert(evaluations)
          .values({ sessionId: c.id, evaluatedAt: now, result })
          .returning();
        if (result !== 'COMPLETE' && result !== 'AUTHORIZED_ABSENCE')
          await addIncident(tx, c, result, `${c.id}:${result}`, now, actorId);
        if (result === 'LATE_ABSENCE' && actualResult === 'MISSING_EXIT')
          await addIncident(
            tx,
            c,
            'MISSING_EXIT',
            `${c.id}:MISSING_EXIT`,
            now,
            actorId,
          );
        await recordAudit(tx, {
          action: 'attendance.evaluated',
          entityType: 'attendance_evaluation',
          entityId: evaluation!.id,
          actorId,
          after: { assignmentId: slot.id, result },
        });
        evaluated++;
      }
      return { evaluated };
    });
  }
  return {
    async policy() {
      return policyView(await latestPolicy(db));
    },
    async updatePolicy(input: AttendancePolicyInput, actorId: string) {
      if (
        ![
          input.lateToleranceMinutes,
          input.earlyEntryMinutes,
          input.lateExitMinutes,
        ].every(Number.isInteger) ||
        input.lateToleranceMinutes < 0 ||
        input.lateToleranceMinutes > 120 ||
        input.earlyEntryMinutes < 0 ||
        input.earlyEntryMinutes > 1440 ||
        input.lateExitMinutes < 0 ||
        input.lateExitMinutes > 1440
      )
        fail('INVALID_POLICY', 'Política inválida.');
      return db.transaction(async (tx) => {
        await lock(tx);
        const current = await latestPolicy(tx);
        const administrativeAbsenceMinutes =
          input.administrativeAbsenceMinutes === undefined
            ? current.administrativeAbsenceMinutes
            : input.administrativeAbsenceMinutes;
        if (
          administrativeAbsenceMinutes !== null &&
          (!Number.isInteger(administrativeAbsenceMinutes) ||
            administrativeAbsenceMinutes < 1 ||
            administrativeAbsenceMinutes > 1440 ||
            administrativeAbsenceMinutes <= input.lateToleranceMinutes)
        )
          fail(
            'INVALID_POLICY',
            'El corte de falta administrativa debe ser posterior a la tolerancia y de hasta 1440 minutos.',
          );
        const [row] = await tx
          .insert(policies)
          .values({
            ...input,
            administrativeAbsenceMinutes,
            version: current.version + 1,
            activatedAt: current.activatedAt,
            createdAt: clock(),
            createdBy: actorId,
          })
          .returning();
        await recordAudit(tx, {
          action: 'attendance.policy.created',
          entityType: 'attendance_policy',
          entityId: row!.id,
          actorId,
          after: policyView(row!),
        });
        return policyView(row!);
      });
    },
    async me(scope: SessionView) {
      const now = clock();
      const [employee] = scope.employeeId
        ? await db
            .select({
              id: employees.id,
              employeeNumber: employees.employeeNumber,
              fullName: employees.fullName,
              category: employees.category,
              status: employees.status,
            })
            .from(employees)
            .where(
              and(
                eq(employees.id, scope.employeeId),
                eq(employees.userId, scope.user.id),
              ),
            )
        : [];
      const from = new Date(now.getTime() - 3 * 86400000)
          .toISOString()
          .slice(0, 10),
        to = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);
      return {
        employee: employee ?? null,
        serverTime: now.toISOString(),
        policy: policyView(await latestPolicy(db)),
        pendingIncidents: employee
          ? (
              await Promise.all(
                (
                  await db
                    .select({ incident: incidents })
                    .from(incidents)
                    .leftJoin(reasons, eq(reasons.incidentId, incidents.id))
                    .where(
                      and(
                        eq(incidents.employeeId, employee.id),
                        isNull(reasons.id),
                      ),
                    )
                ).map((r) => incidentView(db, r.incident)),
              )
            ).filter((i) => i.requiresReason)
          : [],
        items: employee
          ? await list(from, to, {
              ...scope,
              managedDepartmentIds: [],
              permissions: { ...scope.permissions, viewAllEmployees: false },
            })
          : [],
      };
    },
    summary: list,
    async incidents(from: string, to: string, scope: SessionView) {
      return (await list(from, to, scope)).flatMap((s) => s.incidents);
    },
    async reason(id: string, text: string, scope: SessionView) {
      return db.transaction(async (tx) => {
        await lock(tx);
        const [i] = await tx
          .select()
          .from(incidents)
          .where(
            and(
              eq(incidents.id, id),
              eq(
                incidents.employeeId,
                scope.employeeId ?? '00000000-0000-0000-0000-000000000000',
              ),
            ),
          );
        const [employee] = i
          ? await tx
              .select()
              .from(employees)
              .where(
                and(
                  eq(employees.id, i.employeeId),
                  eq(employees.userId, scope.user.id),
                ),
              )
          : [];
        if (!i || !employee)
          fail('INCIDENT_NOT_FOUND', 'Incidencia no encontrada.', 404);
        await addReason(tx, i, text, scope.user.id, clock());
        return incidentView(tx, i);
      });
    },
    async punch(
      input: AttendancePunchInput,
      scope: SessionView,
    ): Promise<AttendancePunchResult> {
      return db.transaction(async (tx) => {
        await lock(tx);
        const now = clock();
        const [fingerprintSlot] = await tx
          .select({ modality: scheduleAssignments.modality })
          .from(scheduleAssignments)
          .where(eq(scheduleAssignments.id, input.assignmentId));
        const home = fingerprintSlot?.modality === 'HOME_OFFICE';
        const fingerprint = createHash('sha256')
          .update(
            JSON.stringify({
              assignmentId: input.assignmentId,
              direction: input.direction,
              latitude: home ? null : (input.latitude ?? null),
              longitude: home ? null : (input.longitude ?? null),
              accuracy: home ? null : (input.accuracy ?? null),
              reason: input.reason ?? null,
            }),
          )
          .digest('hex');
        const [old] = await tx
          .select()
          .from(attempts)
          .where(eq(attempts.idempotencyKey, input.idempotencyKey));
        if (old) {
          if (
            old.createdBy !== scope.user.id ||
            old.requestFingerprint !== fingerprint
          )
            fail(
              'IDEMPOTENCY_CONFLICT',
              'El identificador ya se utilizó con otro contenido.',
              409,
            );
          return old.responseSnapshot;
        }
        const [employee] = await tx
          .select()
          .from(employees)
          .where(
            and(
              eq(
                employees.id,
                scope.employeeId ?? '00000000-0000-0000-0000-000000000000',
              ),
              eq(employees.userId, scope.user.id),
              eq(employees.status, 'ACTIVE'),
            ),
          );
        if (!employee)
          fail(
            'OWN_EMPLOYEE_REQUIRED',
            'Tu cuenta requiere un empleado activo vinculado.',
            403,
          );
        const [slot] = await tx
          .select()
          .from(scheduleAssignments)
          .where(
            and(
              eq(scheduleAssignments.id, input.assignmentId),
              eq(scheduleAssignments.employeeId, employee.id),
              eq(scheduleAssignments.status, 'PUBLISHED'),
            ),
          );
        if (!slot)
          fail('ASSIGNMENT_NOT_FOUND', 'Selecciona tu turno publicado.', 404);
        const pending = await tx
          .select({ incident: incidents })
          .from(incidents)
          .leftJoin(reasons, eq(reasons.incidentId, incidents.id))
          .where(
            and(eq(incidents.employeeId, employee.id), isNull(reasons.id)),
          );
        const unresolved = await Promise.all(
          pending.map(({ incident }) => getIncidentResolution(tx, incident.id)),
        );
        if (unresolved.some((resolution) => !resolution))
          fail(
            'REASON_REQUIRED',
            'Captura el motivo de la incidencia pendiente antes del siguiente marcaje.',
            409,
          );
        if (input.reason) reasonText(input.reason);
        const c = await control(tx, slot, now);
        const aa = await tx
          .select()
          .from(attempts)
          .where(
            and(eq(attempts.sessionId, c.id), eq(attempts.accepted, true)),
          );
        const geo =
          slot.modality === 'HOME_OFFICE'
            ? { id: null, result: 'NOT_REQUIRED' }
            : await recordLocationCheck(tx, {
                employeeId: employee.id,
                actorId: scope.user.id,
                modality: slot.modality,
                requiredLocationId: slot.locationId,
                checkedAt: now,
                timeZone: slot.timeZone,
                ...(input.latitude === undefined
                  ? {}
                  : { latitude: input.latitude }),
                ...(input.longitude === undefined
                  ? {}
                  : { longitude: input.longitude }),
                ...(input.accuracy === undefined
                  ? {}
                  : { accuracy: input.accuracy }),
              });
        const verdict = classifyPunch(
          input.direction,
          now,
          { ...slot, category: slot.snapshot.category },
          c.policySnapshot,
        );
        let rejectionCode: string | null = !verdict.accepted
          ? 'OUTSIDE_WINDOW'
          : !['VALID', 'NOT_REQUIRED'].includes(geo.result)
            ? geo.result
            : null;
        if (aa.some((a) => a.direction === input.direction))
          rejectionCode = 'DUPLICATE_DIRECTION';
        if (
          input.direction === 'ENTRY' &&
          aa.some((a) => a.direction === 'EXIT')
        )
          rejectionCode = 'OUT_OF_ORDER';
        const accepted = rejectionCode === null,
          id = randomUUID();
        const kinds = rejectionCode
          ? [rejectionCode]
          : [
              verdict.incident,
              ...(input.direction === 'EXIT' &&
              !aa.some((a) => a.direction === 'ENTRY')
                ? ['MISSING_ENTRY']
                : []),
            ].filter((k): k is string => k !== null);
        const created: AttendanceIncidentView[] = [];
        for (const kind of kinds) {
          const i = await addIncident(
            tx,
            c,
            kind,
            ['MISSING_ENTRY', 'LATE_ABSENCE'].includes(kind)
              ? `${c.id}:${kind}`
              : `${id}:${kind}`,
            now,
            scope.user.id,
            id,
            input.reason,
          );
          if (i) created.push(await incidentView(tx, i));
        }
        const attempt = {
          id,
          sessionId: c.id,
          assignmentId: slot.id,
          employeeId: employee.id,
          direction: input.direction,
          recordedAt: now.toISOString(),
          accepted,
          rejectionCode,
          geoCheckId: geo.id,
        };
        const response = {
          attempt,
          incidents: created,
          requiresReason: created.some((i) => i.requiresReason),
        };
        await tx.insert(attempts).values({
          ...attempt,
          recordedAt: now,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: fingerprint,
          responseSnapshot: response,
          createdBy: scope.user.id,
        });
        const event = await recordAudit(tx, {
          action: accepted
            ? 'attendance.punch.accepted'
            : 'attendance.punch.rejected',
          entityType: 'attendance_attempt',
          entityId: id,
          actorId: scope.user.id,
          after: attempt,
        });
        await notify(tx, event, employee.id, now);
        return response;
      });
    },
    evaluate: (from: string, to: string, actorId?: string) =>
      evaluate(from, to, actorId ?? null),
    evaluateDue: () => evaluate(),
  };
}
export type AttendanceService = ReturnType<typeof createAttendanceService>;
