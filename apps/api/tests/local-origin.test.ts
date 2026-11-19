import { expect, it } from 'vitest';
import { trustedOrigins } from '../src/modules/identity/http/access.js';

it('admite localhost y 127.0.0.1 del mismo puerto solo en desarrollo', () => {
  expect(
    trustedOrigins('http://127.0.0.1:5173', true).has('http://localhost:5173'),
  ).toBe(true);
  expect(
    trustedOrigins('http://localhost:5173', true).has('http://127.0.0.1:5173'),
  ).toBe(true);
  expect(
    trustedOrigins('http://127.0.0.1:5173', false).has('http://localhost:5173'),
  ).toBe(false);
});
it('no permite otros puertos, esquemas ni dominios por ser desarrollo', () => {
  const origins = trustedOrigins('http://127.0.0.1:5173', true);
  for (const value of [
    'http://localhost:5174',
    'https://localhost:5173',
    'http://evil.localhost:5173',
    'http://127.0.0.1.evil.test:5173',
  ])
    expect(origins.has(value)).toBe(false);
  expect([...trustedOrigins('https://asistencia.example', true)]).toEqual([
    'https://asistencia.example',
  ]);
});
