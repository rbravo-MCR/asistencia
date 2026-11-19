import type { ShiftTemplateInput } from '@asistencia/contracts';
export class PlanningError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}
export function fail(
  message: string,
  code = 'INVALID_PLANNING',
  status = 400,
): never {
  throw new PlanningError(code, message, status);
}
export function civilDate(value: string): Date {
  const day = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== value ||
    value < '1900-01-01' ||
    value > '9999-12-31'
  )
    fail('Indica una fecha civil válida.');
  return day;
}
export function validateCalendarRange(from: string, to: string) {
  const days = (civilDate(to).getTime() - civilDate(from).getTime()) / 86400000;
  if (days < 0 || days > 92) fail('El rango debe contener entre 1 y 93 días.');
}
export function normalizeTemplate(
  input: ShiftTemplateInput,
): ShiftTemplateInput {
  const name = input.name.normalize('NFC').trim();
  if (!name || name.length > 150 || name.includes('\u0000'))
    fail('Indica un nombre de hasta 150 caracteres.');
  if (
    (input.category === 'OPERATIONAL' && input.modality !== 'HOME_OFFICE') ||
    (input.category === 'ADMINISTRATIVE' && input.modality !== 'ONSITE')
  )
    fail('Modalidad incompatible con la categoría.');
  if (!['ADMINISTRATIVE', 'OPERATIONAL'].includes(input.category))
    fail('Categoría inválida.');
  if (
    ![input.startTime, input.endTime].every((t) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
    ) ||
    input.startTime === input.endTime
  )
    fail('El horario debe tener inicio y fin diferentes.');
  if (
    !input.weekdays.length ||
    new Set(input.weekdays).size !== input.weekdays.length ||
    input.weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)
  )
    fail('Indica días de semana válidos.');
  try {
    new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format();
  } catch {
    fail('Zona horaria IANA inválida.');
  }
  return {
    ...input,
    name,
    weekdays: [...input.weekdays].sort((a, b) => a - b),
  };
}
function civilInstant(day: string, time: string, timeZone: string) {
  const target = new Date(`${day}T${time}:00Z`).getTime();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const represented = (instant: number) => {
    const p = Object.fromEntries(
      formatter.formatToParts(instant).map((p) => [p.type, p.value]),
    );
    return Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
  };
  const offsets = new Set<number>();
  for (let h = -36; h <= 36; h += 6) {
    const sample = target + h * 3600000;
    offsets.add(represented(sample) - sample);
  }
  const candidates = [...offsets]
    .map((offset) => target - offset)
    .filter((candidate) => represented(candidate) === target);
  if (candidates.length !== 1)
    fail('Hora civil ambigua o inexistente en la zona indicada.');
  return new Date(candidates[0]!);
}
export function civilInterval(
  workDate: string,
  template: Pick<ShiftTemplateInput, 'startTime' | 'endTime' | 'timeZone'>,
) {
  const day = civilDate(workDate);
  if (template.endTime < template.startTime)
    day.setUTCDate(day.getUTCDate() + 1);
  return {
    startsAt: civilInstant(workDate, template.startTime, template.timeZone),
    endsAt: civilInstant(
      day.toISOString().slice(0, 10),
      template.endTime,
      template.timeZone,
    ),
  };
}
