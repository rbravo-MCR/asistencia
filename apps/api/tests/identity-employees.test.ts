import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  validatePassword,
} from '../src/modules/identity/domain/policy.js';
import { normalizeEmployeeInput } from '../src/modules/employees/domain/employee.js';
import {
  hashPassword,
  verifyPassword,
} from '../src/modules/identity/infrastructure/password.js';

describe('identidad y expediente', () => {
  it('normaliza correo y rechaza contraseñas débiles sin truncarlas', () => {
    expect(normalizeEmail(' ADMIN@EXAMPLE.COM ')).toBe('admin@example.com');
    expect(() => validatePassword('short')).toThrow();
    expect(() => validatePassword('abc123')).not.toThrow();
    expect(() => validatePassword('𠮷'.repeat(5))).toThrow();
    expect(() => validatePassword('𠮷'.repeat(6))).not.toThrow();
    expect(() => validatePassword('a'.repeat(129))).toThrow();
    expect(() =>
      validatePassword(' una clave suficientemente larga '),
    ).not.toThrow();
  });
  it('usa Argon2id con salt diferente y verifica la contraseña completa', async () => {
    const value = 'Contraseña de prueba 2026!';
    const first = await hashPassword(value);
    const second = await hashPassword(value);
    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
    expect(await verifyPassword(first, value)).toBe(true);
    expect(await verifyPassword(first, value + ' ')).toBe(false);
  });
  it('valida expediente y fechas civiles reales', () => {
    const input = {
      employeeNumber: ' 001 ',
      fullName: ' Ana Pérez ',
      departmentId: '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
      position: ' Soporte ',
      joinedOn: '2024-02-29',
      category: 'ADMINISTRATIVE' as const,
      status: 'ACTIVE' as const,
      supervisorId: null,
      userId: null,
    };
    expect(normalizeEmployeeInput(input).employeeNumber).toBe('001');
    expect(normalizeEmployeeInput(input).fullName).toBe('Ana Pérez');
    expect(() =>
      normalizeEmployeeInput({ ...input, employeeNumber: '999999' }),
    ).toThrow();
    expect(() =>
      normalizeEmployeeInput({ ...input, joinedOn: '2025-02-29' }),
    ).toThrow();
    expect(() => normalizeEmployeeInput({ ...input, fullName: ' ' })).toThrow();
    expect(() =>
      normalizeEmployeeInput({ ...input, employeeNumber: 'x'.repeat(31) }),
    ).toThrow();
  });
});
