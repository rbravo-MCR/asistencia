import { describe, expect, it } from 'vitest';
import { employeeSchema, assignmentSchema } from './form-schema';
import { passwordSchema } from '../identity/form-schema';
const id = '5ff93c1e-33a0-4f04-b5d1-503f339d0c61';
const employee = {
  employeeNumber: ' 1 ',
  fullName: ' Jose\u0301 ',
  departmentId: id,
  position: ' Puesto ',
  joinedOn: '2024-02-29',
  category: 'ADMINISTRATIVE',
  status: 'ACTIVE',
  supervisorId: '',
  userId: '',
};
describe('formularios de organización', () => {
  it('normaliza nombres NFC y espacios sin convertir fecha civil en instante', () => {
    expect(employeeSchema.parse(employee)).toMatchObject({
      employeeNumber: '1',
      fullName: 'José',
      position: 'Puesto',
      joinedOn: '2024-02-29',
      supervisorId: null,
      userId: null,
    });
  });
  it('rechaza fechas civiles inexistentes y nombres demasiado largos', () => {
    expect(
      employeeSchema.safeParse({ ...employee, joinedOn: '2025-02-29' }).success,
    ).toBe(false);
    expect(
      employeeSchema.safeParse({ ...employee, fullName: 'x'.repeat(151) })
        .success,
    ).toBe(false);
  });
  it('exige departamento e intervalo UTC ordenado para suplencia', () => {
    const valid = {
      kind: 'SUBSTITUTE',
      employeeId: id,
      departmentId: id,
      startsAt: '2026-11-12T08:00',
      endsAt: '2026-11-12T16:00',
      reason: ' Vacaciones ',
    };
    expect(assignmentSchema.parse(valid)).toMatchObject({
      startsAt: '2026-11-12T08:00:00.000Z',
      endsAt: '2026-11-12T16:00:00.000Z',
      reason: 'Vacaciones',
    });
    expect(
      assignmentSchema.safeParse({ ...valid, endsAt: valid.startsAt }).success,
    ).toBe(false);
    expect(
      assignmentSchema.safeParse({ ...valid, departmentId: '' }).success,
    ).toBe(false);
  });
  it('director no envía departamento ni fechas reservadas a suplencia', () => {
    expect(
      assignmentSchema.parse({
        kind: 'DIRECTOR',
        employeeId: id,
        departmentId: id,
        startsAt: '',
        endsAt: '',
        reason: 'Nombramiento',
      }),
    ).toEqual({
      kind: 'DIRECTOR',
      employeeId: id,
      departmentId: null,
      reason: 'Nombramiento',
    });
  });
  it('cuenta puntos de código de contraseñas y conserva los espacios', () => {
    expect(passwordSchema.parse('😀'.repeat(128))).toBe('😀'.repeat(128));
    expect(passwordSchema.safeParse('😀'.repeat(129)).success).toBe(false);
    expect(passwordSchema.parse(' 1234567890 ')).toBe(' 1234567890 ');
  });
});

it('valida celular internacional y dirección por puntos de código; permite dejarlos vacíos', () => {
  expect(
    employeeSchema.parse({
      ...employee,
      phoneNumber: ' +52 (999) 123-4567 ',
      address: '  Me\u0301rida  ',
    }),
  ).toMatchObject({ phoneNumber: '+529991234567', address: 'Mérida' });
  expect(
    employeeSchema.parse({ ...employee, phoneNumber: '', address: ' ' }),
  ).toMatchObject({ phoneNumber: null, address: null });
  for (const phoneNumber of ['123', 'abc9991234567', '1'.repeat(16)])
    expect(employeeSchema.safeParse({ ...employee, phoneNumber }).success).toBe(
      false,
    );
  expect(
    employeeSchema.safeParse({ ...employee, address: '😀'.repeat(500) })
      .success,
  ).toBe(true);
  expect(
    employeeSchema.safeParse({ ...employee, address: 'a'.repeat(501) }).success,
  ).toBe(false);
});
