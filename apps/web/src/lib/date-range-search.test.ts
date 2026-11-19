import { expect, it } from 'vitest';
import { attendanceSearch, dateRangeSearch } from './date-range-search';
it('accepts bounded civil intervals across months without using device dates', () => {
  expect(dateRangeSearch({ from: '2030-01-30', to: '2030-02-05' })).toEqual({
    from: '2030-01-30',
    to: '2030-02-05',
  });
});
it('drops impossible, reversed, partial and overlong intervals', () => {
  for (const search of [
    { from: '2030-02-30', to: '2030-03-01' },
    { from: '2030-02-02', to: '2030-02-01' },
    { from: '2030-01-01' },
    { from: '2030-01-01', to: '2030-12-31' },
    { from: ['2030-01-01'], to: '2030-01-02' },
  ])
    expect(dateRangeSearch(search)).toEqual({});
});
it('keeps a bounded shift hint alongside the attendance range', () => {
  expect(
    attendanceSearch({
      from: '2030-01-30',
      to: '2030-02-05',
      shift: '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
    }),
  ).toEqual({
    from: '2030-01-30',
    to: '2030-02-05',
    shift: '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
  });
  expect(attendanceSearch({ shift: 'x'.repeat(65) })).toEqual({});
  expect(attendanceSearch({ shift: ['a'] })).toEqual({});
});
