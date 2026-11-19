import { describe, expect, it } from 'vitest';
import {
  civilInterval,
  normalizeTemplate,
  validateCalendarRange,
} from '../src/modules/planning/domain/planning.js';
const template = {
  name: 'Turno',
  category: 'OPERATIONAL' as const,
  modality: 'HOME_OFFICE' as const,
  startTime: '16:00',
  endTime: '00:00',
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  timeZone: 'America/Merida',
  active: true,
};
describe('planificación civil', () => {
  it('conserva fecha civil y cruza medianoche en UTC', () => {
    expect(civilInterval('2026-11-12', template)).toEqual({
      startsAt: new Date('2026-11-12T22:00:00Z'),
      endsAt: new Date('2026-11-13T06:00:00Z'),
    });
  });
  it('rechaza horas civiles ambiguas e inexistentes por DST', () => {
    expect(() =>
      civilInterval('2026-11-01', {
        ...template,
        timeZone: 'America/New_York',
        startTime: '01:30',
        endTime: '03:00',
      }),
    ).toThrow();
    expect(() =>
      civilInterval('2026-03-08', {
        ...template,
        timeZone: 'America/New_York',
        startTime: '02:30',
        endTime: '04:00',
      }),
    ).toThrow();
  });
  it('rechaza modalidad incompatible, zona falsa, horario vacío y días repetidos', () => {
    for (const patch of [
      { modality: 'ONSITE' },
      { timeZone: 'Inventada' },
      { endTime: '16:00' },
      { weekdays: [1, 1] },
    ])
      expect(() =>
        normalizeTemplate({ ...template, ...patch } as typeof template),
      ).toThrow();
  });
  it('valida fechas reales y rango inclusivo de hasta 93 días', () => {
    expect(() => validateCalendarRange('2026-02-30', '2026-03-01')).toThrow();
    expect(() =>
      validateCalendarRange('2026-01-01', '2026-04-03'),
    ).not.toThrow();
    expect(() => validateCalendarRange('2026-01-01', '2026-04-04')).toThrow();
  });
});
