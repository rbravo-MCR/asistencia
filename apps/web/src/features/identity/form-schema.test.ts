import { expect, it } from 'vitest';
import { loginSchema, passwordSchema, userSchema } from './form-schema';
const input = {
  email: 'persona@example.test',
  name: 'Persona',
  roles: ['EMPLOYEE'] as const,
  active: true,
  password: 'Contraseña válida 2026!',
};
it('valida el nombre por puntos Unicode igual que el servidor', () => {
  expect(
    userSchema.safeParse({
      ...input,
      roles: [...input.roles],
      name: '𠮷'.repeat(150),
    }).success,
  ).toBe(true);
  expect(
    userSchema.safeParse({
      ...input,
      roles: [...input.roles],
      name: '𠮷'.repeat(151),
    }).success,
  ).toBe(false);
});
it('rechaza caracteres nulos en nombres antes de enviar el formulario', () => {
  expect(
    userSchema.safeParse({
      ...input,
      roles: [...input.roles],
      name: 'Nombre\u0000inválido',
    }).success,
  ).toBe(false);
});

it('acepta desde 6 caracteres y conserva el máximo de 128 sin recortar', () => {
  expect(passwordSchema.safeParse('abc12').success).toBe(false);
  expect(passwordSchema.safeParse('abc123').success).toBe(true);
  expect(passwordSchema.safeParse('𠮷'.repeat(5)).success).toBe(false);
  expect(passwordSchema.safeParse('𠮷'.repeat(6)).success).toBe(true);
  expect(passwordSchema.parse(' abc1 ')).toBe(' abc1 ');
  expect(passwordSchema.safeParse('a'.repeat(128)).success).toBe(true);
  expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
});

it('admite número de usuario o correo al ingresar', () => {
  expect(
    loginSchema.safeParse({ identifier: '999999', password: 'abc123' }).success,
  ).toBe(true);
  expect(
    loginSchema.safeParse({
      identifier: 'admin@example.test',
      password: 'abc123',
    }).success,
  ).toBe(true);
  expect(
    loginSchema.safeParse({ identifier: '', password: 'abc123' }).success,
  ).toBe(false);
});
