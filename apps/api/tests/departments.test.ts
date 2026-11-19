import { describe, expect, it } from 'vitest';
import {
  normalizeDepartmentName,
  InvalidDepartmentNameError,
} from '../src/modules/departments/domain/department.js';

describe('nombre de departamento', () => {
  it('elimina espacios externos y conserva mayúsculas y espacios internos', () => {
    expect(normalizeDepartmentName('  Administración  General  ')).toBe(
      'Administración  General',
    );
  });
  it('normaliza Unicode NFC para evitar nombres visualmente iguales', () => {
    expect(normalizeDepartmentName('Informacio\u0301n')).toBe('Información');
  });
  it.each(['', ' ', '\t\n', '\u00a0', 'a'.repeat(101)])(
    'rechaza nombres inválidos: %j',
    (name) => {
      expect(() => normalizeDepartmentName(name)).toThrow(
        InvalidDepartmentNameError,
      );
    },
  );
  it('acepta exactamente cien caracteres', () => {
    expect(normalizeDepartmentName('Á'.repeat(100))).toHaveLength(100);
  });
});

it('rechaza caracteres nulos antes de acceder a PostgreSQL', () => {
  expect(() => normalizeDepartmentName('RR\u0000HH')).toThrow(
    InvalidDepartmentNameError,
  );
});
