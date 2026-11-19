import { z } from 'zod';
import { text } from '../identity/form-schema';
const id = z.uuid('Selecciona una opción válida.');
const optionalId = z
  .union([z.literal(''), id])
  .transform((value) => value || null);
const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Escribe una fecha válida.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, 'La fecha no existe.');
const phoneNumber = z
  .string()
  .default('')
  .transform((value) => value.trim())
  .refine(
    (value) =>
      !value ||
      (value.length <= 64 &&
        /^\+?[0-9\s().-]+$/.test(value) &&
        /^\+?[0-9]{7,15}$/.test(value.replace(/[\s().-]/g, ''))),
    'Escribe un celular de 7 a 15 dígitos; puede incluir + al inicio.',
  )
  .transform((value) => (value ? value.replace(/[\s().-]/g, '') : null));
const address = z
  .string()
  .default('')
  .transform((value) => value.normalize('NFC').trim())
  .refine(
    (value) => Array.from(value).length <= 500 && !value.includes('\u0000'),
    'La dirección admite hasta 500 caracteres y no puede contener caracteres nulos.',
  )
  .transform((value) => value || null);
export const employeeSchema = z.object({
  employeeNumber: text(30),
  fullName: text(150),
  phoneNumber,
  address,
  departmentId: id,
  position: text(120),
  joinedOn: civilDate,
  category: z.enum(['ADMINISTRATIVE', 'OPERATIONAL']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  supervisorId: optionalId,
  userId: optionalId,
});
export const employeeCreateSchema = employeeSchema.extend({
  employeeNumber: z.undefined().optional(),
});
const instant = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(`${value}:00.000Z`)) &&
      new Date(`${value}:00.000Z`).toISOString().slice(0, 16) === value,
    'Escribe una fecha y hora UTC válidas.',
  );
export const assignmentSchema = z
  .object({
    kind: z.enum(['HEAD', 'DIRECTOR', 'SUBSTITUTE']),
    employeeId: id,
    departmentId: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
    reason: text(1000),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== 'DIRECTOR' && !id.safeParse(value.departmentId).success)
      ctx.addIssue({
        code: 'custom',
        path: ['departmentId'],
        message: 'Selecciona un departamento.',
      });
    if (value.kind === 'SUBSTITUTE') {
      for (const field of ['startsAt', 'endsAt'] as const) {
        if (!instant.safeParse(value[field]).success)
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: 'Escribe una fecha y hora UTC válidas.',
          });
      }
      if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt)
        ctx.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'El fin debe ser posterior al inicio.',
        });
    }
  })
  .transform((value) => ({
    kind: value.kind,
    employeeId: value.employeeId,
    departmentId: value.kind === 'DIRECTOR' ? null : value.departmentId,
    reason: value.reason,
    ...(value.kind === 'SUBSTITUTE'
      ? {
          startsAt: new Date(`${value.startsAt}:00.000Z`).toISOString(),
          endsAt: new Date(`${value.endsAt}:00.000Z`).toISOString(),
        }
      : {}),
  }));
export const categoryLabels = {
  ADMINISTRATIVE: 'Administrativo',
  OPERATIONAL: 'Operativo',
};
export const statusLabels = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' };
export const assignmentLabels = {
  HEAD: 'Jefatura',
  DIRECTOR: 'Dirección',
  SUBSTITUTE: 'Suplencia',
};
