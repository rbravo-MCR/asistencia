import { z } from 'zod';

export const departmentFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(
      z
        .string()
        .min(1, 'El nombre es obligatorio.')
        .refine(
          (value) => Array.from(value).length <= 100,
          'El nombre debe tener como máximo 100 caracteres.',
        )
        .refine(
          (value) => !value.includes('\u0000'),
          'El nombre contiene un carácter no permitido.',
        ),
    ),
});
export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;
