import { expect, it } from 'vitest';
import {
  anniversaryDate,
  chargedDates,
  validateEvidence,
  entitlementDays,
  requestFingerprint,
} from '../src/modules/requests/domain/leave.js';
it('clamps February leap anniversaries and derives explicit seniority entitlement', () => {
  expect(anniversaryDate('2024-02-29', 1)).toBe('2025-02-28');
  expect(anniversaryDate('2024-02-29', 4)).toBe('2028-02-29');
  expect(
    entitlementDays(
      [
        { fromYear: 1, days: 12 },
        { fromYear: 6, days: 22 },
      ],
      5,
    ),
  ).toBe(12);
  expect(
    entitlementDays(
      [
        { fromYear: 1, days: 12 },
        { fromYear: 6, days: 22 },
      ],
      6,
    ),
  ).toBe(22);
});
it('counts civil working days and holidays without DST arithmetic', () => {
  expect(
    chargedDates('2026-11-13', '2026-11-17', [1, 2, 3, 4, 5], ['2026-11-16']),
  ).toEqual(['2026-11-13', '2026-11-17']);
  expect(() => chargedDates('2026-02-30', '2026-03-01', [1], [])).toThrow();
  expect(() => chargedDates('2026-01-01', '2026-04-04', [1], [])).toThrow();
});
it('validates real private file bytes, canonical base64, safe names and one MiB limit', () => {
  expect(
    validateEvidence({
      filename: 'constancia.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.from('%PDF-1.7\nfixture').toString('base64'),
    }).bytes.toString(),
  ).toBe('%PDF-1.7\nfixture');
  expect(() =>
    validateEvidence({
      filename: '../secret.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.from('%PDF-1.7').toString('base64'),
    }),
  ).toThrow();
  expect(() =>
    validateEvidence({
      filename: 'x.png',
      mimeType: 'image/png',
      contentBase64: Buffer.from('%PDF-1.7').toString('base64'),
    }),
  ).toThrow();
  expect(() =>
    validateEvidence({
      filename: 'x.pdf',
      mimeType: 'application/pdf',
      contentBase64: '%%%%',
    }),
  ).toThrow();
  expect(() =>
    validateEvidence({
      filename: 'x.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.alloc(1048577, 1).toString('base64'),
    }),
  ).toThrow();
});
it('fingerprints content independent of property order but retains operation and actor', () => {
  expect(requestFingerprint({ a: 1, b: 2 })).toBe(
    requestFingerprint({ b: 2, a: 1 }),
  );
  expect(requestFingerprint({ actor: 'a', operation: 'approve' })).not.toBe(
    requestFingerprint({ actor: 'b', operation: 'approve' }),
  );
});
it('accepts a valid evidence file at the one MiB boundary', () => {
  const bytes = Buffer.alloc(1048576, 32);
  Buffer.from('%PDF-1.7\n').copy(bytes);
  expect(
    validateEvidence({
      filename: 'limite.pdf',
      mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64'),
    }).bytes.length,
  ).toBe(1048576);
});
