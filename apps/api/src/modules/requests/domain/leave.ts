import { createHash } from 'node:crypto';
import type { EvidenceInput } from '@asistencia/contracts';
export class RequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}
export function fail(code: string, message: string, status = 400): never {
  throw new RequestError(code, message, status);
}
export function cleanText(value: string, max = 2000) {
  const s = value.normalize('NFC').trim();
  if (!s || s.length > max || s.includes('\0'))
    fail('INVALID_TEXT', 'Texto inválido.');
  return s;
}
export function civil(value: string) {
  const t = Date.parse(value);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(t) ||
    new Date(t).toISOString().slice(0, 10) !== value
  )
    fail('INVALID_DATE', 'Fecha civil inválida.');
  return value;
}
export function dateRange(from: string, to: string) {
  civil(from);
  civil(to);
  if (to < from || Date.parse(to) - Date.parse(from) > 92 * 86400000)
    fail('INVALID_RANGE', 'Selecciona un período de 1 a 93 días.');
}
export function meridaDate(now: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Merida',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function anniversaryDate(joinedOn: string, year: number) {
  civil(joinedOn);
  if (!Number.isInteger(year) || year < 1 || year > 100)
    fail('INVALID_ANNIVERSARY', 'Aniversario inválido.');
  const [y, m, d] = joinedOn.split('-').map(Number);
  const end = new Date(Date.UTC(y! + year, m!, 0)).getUTCDate();
  return `${y! + year}-${String(m).padStart(2, '0')}-${String(Math.min(d!, end)).padStart(2, '0')}`;
}
export function entitlementDays(
  rules: { fromYear: number; days: number }[],
  year: number,
) {
  const matches = rules
    .filter((r) => r.fromYear <= year)
    .sort((a, b) => b.fromYear - a.fromYear);
  if (!matches.length)
    fail(
      'POLICY_REQUIRED',
      'No existe regla de vacaciones para esa antigüedad.',
      409,
    );
  return matches[0]!.days;
}
export function chargedDates(
  from: string,
  to: string,
  weekdays: number[],
  holidays: string[],
) {
  dateRange(from, to);
  const result: string[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) {
    const d = new Date(t);
    const value = d.toISOString().slice(0, 10);
    if (weekdays.includes(d.getUTCDay() || 7) && !holidays.includes(value))
      result.push(value);
  }
  return result;
}
export function validateEvidence(input: EvidenceInput) {
  const filename = input.filename.normalize('NFC').trim();
  if (
    !filename ||
    filename.length > 150 ||
    /[\\/]/.test(filename) ||
    [...filename].some(
      (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
    ) ||
    !/^[-A-Za-z0-9_+. ()\p{L}\p{N}]+$/u.test(filename)
  )
    fail('INVALID_EVIDENCE', 'Nombre de archivo inválido.');
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      input.contentBase64,
    )
  )
    fail('INVALID_EVIDENCE', 'Archivo base64 inválido.');
  const bytes = Buffer.from(input.contentBase64, 'base64');
  if (
    !bytes.length ||
    bytes.length > 1048576 ||
    bytes.toString('base64') !== input.contentBase64
  )
    fail('INVALID_EVIDENCE', 'Cada archivo debe ocupar entre 1 byte y 1 MiB.');
  const signature =
    input.mimeType === 'application/pdf'
      ? bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))
      : input.mimeType === 'image/png'
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : input.mimeType === 'image/jpeg'
          ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          : false;
  if (!signature)
    fail('INVALID_EVIDENCE', 'El contenido no coincide con PDF, PNG o JPEG.');
  return { filename, mimeType: input.mimeType, bytes };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function requestFingerprint(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
