import { expect, it } from 'vitest';
import { Check } from 'typebox/value';
import { UserInputSchema } from '@asistencia/contracts';
import { validateRoles } from '../src/modules/identity/domain/policy.js';
it('accepts a real SUPER_ADMIN role in domain and shared HTTP contract', () => {
  expect(
    validateRoles(['SUPER_ADMIN', 'EMPLOYEE'] as Parameters<
      typeof validateRoles
    >[0]),
  ).toEqual(['SUPER_ADMIN', 'EMPLOYEE']);
  expect(
    Check(UserInputSchema, {
      email: 'owner@example.test',
      name: 'Owner',
      password: 'Clave temporal de pruebas!',
      roles: ['SUPER_ADMIN'],
      active: true,
    }),
  ).toBe(true);
});
