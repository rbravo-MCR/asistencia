export class AttendanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}
export function fail(code: string, message: string, status = 400): never {
  throw new AttendanceError(code, message, status);
}
export function classifyPunch(
  direction: 'ENTRY' | 'EXIT',
  now: Date,
  slot: { startsAt: Date; endsAt: Date; category?: string },
  policy: {
    lateToleranceMinutes: number;
    earlyEntryMinutes: number;
    lateExitMinutes: number;
    administrativeAbsenceMinutes?: number | null;
  },
) {
  const time = now.getTime(),
    start = slot.startsAt.getTime(),
    end = slot.endsAt.getTime();
  if (
    direction === 'ENTRY'
      ? time < start - policy.earlyEntryMinutes * 60000 || time > end
      : time < start || time > end + policy.lateExitMinutes * 60000
  )
    return { accepted: false, incident: 'OUTSIDE_WINDOW' };
  return {
    accepted: true,
    incident:
      direction === 'ENTRY'
        ? slot.category === 'ADMINISTRATIVE' &&
          policy.administrativeAbsenceMinutes != null &&
          time >= start + policy.administrativeAbsenceMinutes * 60000
          ? 'LATE_ABSENCE'
          : Math.floor((time - start) / 60000) > policy.lateToleranceMinutes
            ? 'LATE_ENTRY'
            : null
        : time < end
          ? 'EARLY_EXIT'
          : null,
  };
}
export function omission(entry: boolean, exit: boolean) {
  return entry
    ? exit
      ? 'COMPLETE'
      : 'MISSING_EXIT'
    : exit
      ? 'MISSING_ENTRY'
      : 'ABSENCE';
}
export function validateRange(from: string, to: string) {
  const start = Date.parse(from),
    end = Date.parse(to);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end).toISOString().slice(0, 10) !== to ||
    end < start ||
    end - start > 92 * 86400000
  )
    fail(
      'INVALID_RANGE',
      'El rango debe contener entre 1 y 93 días civiles válidos.',
    );
}
