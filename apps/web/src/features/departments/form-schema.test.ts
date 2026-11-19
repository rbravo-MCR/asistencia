import { describe, expect, it } from 'vitest';
import { departmentFormSchema } from './form-schema';

describe('validación del formulario', () => {
  it('acepta cien caracteres después de NFC y trim', () => {
    const result = departmentFormSchema.safeParse({
      name: ` ${'A\u0301'.repeat(100)} `,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Á'.repeat(100));
  });
  it('cuenta puntos de código, no unidades UTF-16', () => {
    expect(
      departmentFormSchema.safeParse({ name: '😀'.repeat(100) }).success,
    ).toBe(true);
    expect(
      departmentFormSchema.safeParse({ name: '😀'.repeat(101) }).success,
    ).toBe(false);
  });
  it.each([' ', 'a'.repeat(101), 'RR\u0000HH'])(
    'rechaza entrada inválida: %j',
    (name) => {
      expect(departmentFormSchema.safeParse({ name }).success).toBe(false);
    },
  );
});
