import { it, expect } from 'vitest';
import { classifyPunch, omission } from '../src/modules/attendance/domain.js';
const startsAt = new Date('2026-11-12T22:00:00Z');
const endsAt = new Date('2026-11-13T06:00:00Z');
const policy = {
  lateToleranceMinutes: 10,
  earlyEntryMinutes: 30,
  lateExitMinutes: 120,
};
it('uses full minutes for lateness and preserves overnight windows', () => {
  expect(
    classifyPunch(
      'ENTRY',
      new Date('2026-11-12T22:10:59Z'),
      { startsAt, endsAt },
      policy,
    ),
  ).toEqual({ accepted: true, incident: null });
  expect(
    classifyPunch(
      'ENTRY',
      new Date('2026-11-12T22:11:00Z'),
      { startsAt, endsAt },
      policy,
    ),
  ).toEqual({ accepted: true, incident: 'LATE_ENTRY' });
  expect(
    classifyPunch(
      'EXIT',
      new Date('2026-11-13T05:59:59Z'),
      { startsAt, endsAt },
      policy,
    ),
  ).toEqual({ accepted: true, incident: 'EARLY_EXIT' });
  expect(
    classifyPunch(
      'EXIT',
      new Date('2026-11-13T08:00:01Z'),
      { startsAt, endsAt },
      policy,
    ),
  ).toEqual({ accepted: false, incident: 'OUTSIDE_WINDOW' });
});
it('distinguishes absence and both omissions', () => {
  expect(omission(false, false)).toBe('ABSENCE');
  expect(omission(true, false)).toBe('MISSING_EXIT');
  expect(omission(false, true)).toBe('MISSING_ENTRY');
  expect(omission(true, true)).toBe('COMPLETE');
});
it('accepts administrative entry at 08:30 as justifiable absence without changing operational shifts', () => {
  const slot = {
    startsAt: new Date('2030-01-10T14:00:00Z'),
    endsAt: new Date('2030-01-10T23:00:00Z'),
    category: 'ADMINISTRATIVE',
  };
  const configured = { ...policy, administrativeAbsenceMinutes: 30 };
  expect(
    classifyPunch(
      'ENTRY',
      new Date('2030-01-10T14:29:59.999Z'),
      slot,
      configured,
    ),
  ).toEqual({ accepted: true, incident: 'LATE_ENTRY' });
  expect(
    classifyPunch('ENTRY', new Date('2030-01-10T14:30:00Z'), slot, configured),
  ).toEqual({ accepted: true, incident: 'LATE_ABSENCE' });
  expect(
    classifyPunch('ENTRY', new Date('2030-01-10T14:31:00Z'), slot, configured),
  ).toEqual({ accepted: true, incident: 'LATE_ABSENCE' });
  expect(
    classifyPunch(
      'ENTRY',
      new Date('2030-01-10T14:30:00Z'),
      { ...slot, category: 'OPERATIONAL' },
      configured,
    ),
  ).toEqual({ accepted: true, incident: 'LATE_ENTRY' });
  expect(
    classifyPunch('ENTRY', new Date('2030-01-10T14:30:00Z'), slot, policy),
  ).toEqual({ accepted: true, incident: 'LATE_ENTRY' });
});
