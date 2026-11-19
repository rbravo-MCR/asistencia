import { describe, expect, it } from 'vitest';
import { Check } from 'typebox/value';
import {
  normalizeDepartmentName,
  InvalidDepartmentNameError,
} from '../src/modules/departments/domain/department.js';
import {
  CreateDepartmentSchema,
  DepartmentSchema,
  DepartmentListSchema,
} from '@asistencia/contracts';

const output = {
  id: '5ff93c1e-33a0-4f04-b5d1-503f339d0c61',
  name: 'Administración',
  createdAt: '2026-11-12T15:00:00.000Z',
};
describe('contratos de Departamentos', () => {
  it('acepta entrada mínima y salida con UUID y fecha UTC', () => {
    expect(Check(CreateDepartmentSchema, { name: 'Administración' })).toBe(
      true,
    );
    expect(Check(DepartmentSchema, output)).toBe(true);
    expect(Check(DepartmentListSchema, { items: [output] })).toBe(true);
    expect(Check(DepartmentListSchema, { items: [] })).toBe(true);
  });
  it.each([
    { name: '' },
    { name: '\t \n' },
    { name: 123 },
    { name: 'Administración', id: output.id },
    {},
  ])('rechaza entrada inválida o propiedades adicionales', (input) => {
    expect(Check(CreateDepartmentSchema, input)).toBe(false);
  });
  it('rechaza identificadores, fechas y campos extra inválidos en salida', () => {
    expect(Check(DepartmentSchema, { ...output, id: 'incorrecto' })).toBe(
      false,
    );
    expect(Check(DepartmentSchema, { ...output, createdAt: 'ayer' })).toBe(
      false,
    );
    expect(Check(DepartmentSchema, { ...output, privateField: true })).toBe(
      false,
    );
    expect(Check(DepartmentListSchema, { items: [output], total: 1 })).toBe(
      false,
    );
  });
});

it('admite texto de entrada que alcanza el límite después de normalizar', () => {
  expect(Check(CreateDepartmentSchema, { name: 'A\u0301'.repeat(100) })).toBe(
    true,
  );
  expect(Check(CreateDepartmentSchema, { name: 'a'.repeat(100) + ' ' })).toBe(
    true,
  );
});
it('rechaza caracteres nulos tanto en entrada como en salida', () => {
  expect(Check(CreateDepartmentSchema, { name: 'RR\u0000HH' })).toBe(false);
  expect(Check(DepartmentSchema, { ...output, name: 'RR\u0000HH' })).toBe(
    false,
  );
});

it('el dominio impone el límite tras normalizar y la salida conserva ese límite', () => {
  const raw = { name: 'a'.repeat(101) };
  expect(Check(CreateDepartmentSchema, raw)).toBe(true);
  expect(() => normalizeDepartmentName(raw.name)).toThrow(
    InvalidDepartmentNameError,
  );
  expect(Check(DepartmentSchema, { ...output, name: raw.name })).toBe(false);
});
