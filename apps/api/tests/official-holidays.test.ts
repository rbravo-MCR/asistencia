import { expect, it } from 'vitest';
import {
  OFFICIAL_HOLIDAYS,
  OFFICIAL_CALENDAR_SOURCES,
} from '../src/modules/planning/domain/official-holidays.js';
import { chargedDates } from '../src/modules/requests/domain/leave.js';
it('ships only verified official 2026–2027 dates including the ordinary federal election', () => {
  expect(OFFICIAL_HOLIDAYS.map((h) => h.date)).toEqual([
    '2026-01-01',
    '2026-02-02',
    '2026-03-16',
    '2026-05-01',
    '2026-09-16',
    '2026-11-16',
    '2026-12-25',
    '2027-01-01',
    '2027-02-01',
    '2027-03-15',
    '2027-05-01',
    '2027-06-06',
    '2027-09-16',
    '2027-11-15',
    '2027-12-25',
  ]);
  expect(OFFICIAL_CALENDAR_SOURCES.verifiedOn).toBe('2026-11-18');
  expect(OFFICIAL_CALENDAR_SOURCES.lft).toContain('diputados.gob.mx');
  expect(OFFICIAL_CALENDAR_SOURCES.elections).toContain('ine.mx');
  expect(
    chargedDates(
      '2026-12-24',
      '2026-12-28',
      [1, 2, 3, 4, 5],
      OFFICIAL_HOLIDAYS.map((h) => h.date),
    ),
  ).toEqual(['2026-12-24', '2026-12-28']);
});
