import type { SessionView } from '@asistencia/contracts';

/** Identity and authorization only: a refresh or equivalent array order preserves drafts. */
export function sessionScope(session: SessionView | null | undefined) {
  if (!session) return null;
  const canonicalSet = (values: readonly string[]) =>
    [...new Set(values)].sort();
  return JSON.stringify([
    session.user.id,
    canonicalSet(session.user.roles),
    session.employeeId,
    canonicalSet(session.departmentIds),
    canonicalSet(session.managedDepartmentIds),
    Object.entries(session.permissions).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  ]);
}
