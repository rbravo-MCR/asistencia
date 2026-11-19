import { z } from 'zod';
export const text = (max: number) =>
  z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(
      z
        .string()
        .min(1, 'Este campo es obligatorio.')
        .refine(
          (value) => Array.from(value).length <= max,
          `Máximo ${max} caracteres.`,
        )
        .refine(
          (value) => !value.includes('\u0000'),
          'El texto contiene un carácter no permitido.',
        ),
    );
export const passwordSchema = z
  .string()
  .refine(
    (value) => [...value].length >= 6 && [...value].length <= 128,
    'La contraseña debe tener entre 6 y 128 caracteres.',
  );
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Escribe un correo válido.').max(254));
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Escribe tu número de usuario o correo.')
    .max(254),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});
export const recoverSchema = z.object({
  token: text(128),
  password: passwordSchema,
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
  password: passwordSchema,
});
export const roleOptions = ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] as const;
export const roleLabels = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN: 'Administración',
  HR: 'Recursos Humanos',
  EMPLOYEE: 'Empleado',
};
const userFields = {
  email: emailSchema,
  name: text(150),
  roles: z.array(z.enum(roleOptions)).min(1, 'Selecciona al menos un rol.'),
  active: z.boolean(),
};
export const userSchema = z.object({ ...userFields, password: passwordSchema });
export const userUpdateSchema = z.object(userFields);
