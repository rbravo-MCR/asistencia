import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../infrastructure/database/client.js';
import { attendanceIncidents } from '../attendance/schema.js';
import { scheduleAssignments } from '../planning/schema.js';
import { leaveRequests } from './schema.js';
type Reader = Pick<Database, 'select'>;
export async function getApprovedCoverage(
  tx: Reader,
  slot: { employeeId: string; workDate: string; startsAt: Date; endsAt: Date },
) {
  const rows = await tx
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, slot.employeeId),
        eq(leaveRequests.status, 'APPROVED'),
        inArray(leaveRequests.kind, ['VACATION', 'PERMISSION']),
      ),
    );
  for (const r of rows) {
    if (slot.workDate < r.fromDate || slot.workDate > r.toDate) continue;
    if (r.kind === 'VACATION' && !r.chargedDates.includes(slot.workDate))
      continue;
    if (
      r.partialStartsAt &&
      r.partialEndsAt &&
      (r.partialStartsAt > slot.startsAt || r.partialEndsAt < slot.endsAt)
    )
      continue;
    return {
      requestId: r.id,
      kind: r.kind,
      decidedAt: r.resolvedAt!.toISOString(),
    };
  }
  return null;
}
export async function getIncidentResolution(tx: Reader, incidentId: string) {
  const [r] = await tx
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.incidentId, incidentId),
        eq(leaveRequests.kind, 'JUSTIFICATION'),
        eq(leaveRequests.status, 'APPROVED'),
      ),
    );
  if (r) return { requestId: r.id, decidedAt: r.resolvedAt!.toISOString() };
  const [i] = await tx
    .select()
    .from(attendanceIncidents)
    .where(eq(attendanceIncidents.id, incidentId));
  if (!i || !['ABSENCE', 'MISSING_ENTRY', 'MISSING_EXIT'].includes(i.kind))
    return null;
  const [slot] = await tx
    .select()
    .from(scheduleAssignments)
    .where(eq(scheduleAssignments.id, i.assignmentId));
  if (!slot) return null;
  const coverage = await getApprovedCoverage(tx, slot);
  return coverage
    ? { requestId: coverage.requestId, decidedAt: coverage.decidedAt }
    : null;
}
