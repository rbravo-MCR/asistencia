import { and, asc, desc, eq, gte, inArray, or } from 'drizzle-orm';
import type {
  DashboardShift,
  DashboardIncident,
  SessionView,
} from '@asistencia/contracts';
import type { Database } from '../../infrastructure/database/client.js';
import { employees } from '../employees/schema.js';
import { scheduleAssignments } from '../planning/schema.js';
import {
  getApprovedCoverage,
  getIncidentResolution,
} from '../requests/index.js';
import {
  attendancePolicies,
  attendanceSessions,
  attendanceAttempts,
  attendanceEvaluations,
  attendanceIncidents,
  attendanceReasons,
} from './schema.js';
const zero = '00000000-0000-0000-0000-000000000000';
export async function readAttendanceDashboard(
  db: Database,
  scope: SessionView,
  date: string,
  now: Date,
) {
  const visible = scope.permissions.viewAllEmployees
    ? undefined
    : or(
        eq(employees.id, scope.employeeId ?? zero),
        inArray(employees.departmentId, scope.managedDepartmentIds),
      );
  const [latest] = await db
    .select()
    .from(attendancePolicies)
    .orderBy(desc(attendancePolicies.version))
    .limit(1);
  const [initial] = await db
    .select()
    .from(attendancePolicies)
    .orderBy(asc(attendancePolicies.version))
    .limit(1);
  const rows = await db
    .select({ slot: scheduleAssignments, employeeName: employees.fullName })
    .from(scheduleAssignments)
    .innerJoin(employees, eq(employees.id, scheduleAssignments.employeeId))
    .where(
      and(
        visible,
        eq(scheduleAssignments.status, 'PUBLISHED'),
        or(
          eq(scheduleAssignments.workDate, date),
          and(
            eq(employees.id, scope.employeeId ?? zero),
            gte(
              scheduleAssignments.endsAt,
              new Date(now.getTime() - 1440 * 60000),
            ),
          ),
        ),
      ),
    )
    .orderBy(asc(scheduleAssignments.startsAt));
  async function shift(row: (typeof rows)[number]): Promise<DashboardShift> {
    const { slot } = row;
    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.assignmentId, slot.id));
    const attempts = session
      ? await db
          .select({ direction: attendanceAttempts.direction })
          .from(attendanceAttempts)
          .where(
            and(
              eq(attendanceAttempts.sessionId, session.id),
              eq(attendanceAttempts.accepted, true),
            ),
          )
      : [];
    const [evaluation] = session
      ? await db
          .select()
          .from(attendanceEvaluations)
          .where(eq(attendanceEvaluations.sessionId, session.id))
          .orderBy(desc(attendanceEvaluations.evaluatedAt))
          .limit(1)
      : [];
    const entry = attempts.some((a) => a.direction === 'ENTRY'),
      exit = attempts.some((a) => a.direction === 'EXIT');
    const eligible = Boolean(
      session || (initial && slot.startsAt >= initial.activatedAt),
    );
    const deadline =
      slot.endsAt.getTime() +
      (session?.policySnapshot.lateExitMinutes ??
        latest?.lateExitMinutes ??
        120) *
        60000;
    const coverage = await getApprovedCoverage(db, slot);
    return {
      id: slot.id,
      employeeId: slot.employeeId,
      employeeName: row.employeeName,
      workDate: slot.workDate,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      timeZone: slot.timeZone,
      modality: slot.modality,
      entry,
      exit,
      evaluation: evaluation?.result ?? null,
      authorizedAbsence: Boolean(coverage && !(entry && exit)),
      phase: evaluation
        ? 'EVALUATED'
        : !eligible
          ? 'HISTORICAL'
          : now.getTime() > deadline
            ? 'AWAITING_EVALUATION'
            : now < slot.startsAt
              ? 'UPCOMING'
              : 'IN_PROGRESS',
    };
  }
  const shifts = await Promise.all(
    rows.filter((r) => r.slot.workDate === date).map(shift),
  );
  // Policy bounds allow up to 1440 minutes after the scheduled end. Candidate
  // selection includes that maximum; phase applies the actual frozen policy.
  const own = await Promise.all(
    rows.filter((r) => r.slot.employeeId === scope.employeeId).map(shift),
  );
  const next =
    own.find((s) => new Date(s.startsAt) <= now && new Date(s.endsAt) >= now) ??
    own.find((s) => s.phase === 'IN_PROGRESS') ??
    own
      .filter((s) => s.workDate === date && new Date(s.startsAt) <= now)
      .at(-1) ??
    own.find((s) => new Date(s.startsAt) > now) ??
    null;
  const incidentRows = await db
    .select({
      incident: attendanceIncidents,
      employeeName: employees.fullName,
      workDate: scheduleAssignments.workDate,
    })
    .from(attendanceIncidents)
    .innerJoin(employees, eq(employees.id, attendanceIncidents.employeeId))
    .innerJoin(
      scheduleAssignments,
      eq(scheduleAssignments.id, attendanceIncidents.assignmentId),
    )
    .where(visible)
    .orderBy(desc(attendanceIncidents.createdAt));
  const incidents: DashboardIncident[] = [];
  for (const row of incidentRows) {
    if (await getIncidentResolution(db, row.incident.id)) continue;
    const [reason] = await db
      .select({ id: attendanceReasons.id })
      .from(attendanceReasons)
      .where(eq(attendanceReasons.incidentId, row.incident.id))
      .limit(1);
    incidents.push({
      id: row.incident.id,
      employeeId: row.incident.employeeId,
      employeeName: row.employeeName,
      workDate: row.workDate,
      kind: row.incident.kind,
      requiresReason: !reason,
    });
  }
  return { shifts, incidents, personalShift: next };
}
