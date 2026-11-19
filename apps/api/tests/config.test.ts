import { describe, expect, it } from 'vitest';
import { inspect } from 'node:util';
import { parseConfig } from '../src/bootstrap/config.js';

const valid = {
  DATABASE_URL: 'postgresql://local:password@127.0.0.1:55432/asistencia',
};

describe('configuración', () => {
  it('usa valores locales seguros y zona IANA', () => {
    const config = parseConfig(valid);
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3001);
    expect(config.timeZone).toBe('America/Merida');
  });
  it.each([
    {},
    { DATABASE_URL: 'https://example.com' },
    { ...valid, PORT: '0' },
    { ...valid, PORT: '65536' },
    { ...valid, PORT: '' },
    { ...valid, PORT: 'abc' },
    { ...valid, APP_TIME_ZONE: 'Invalid/Zone' },
    { ...valid, LOG_LEVEL: 'verbose' },
    { ...valid, NODE_ENV: 'unknown' },
    { ...valid, ATTENDANCE_WORKER_ENABLED: 'yes' },
    { ...valid, ATTENDANCE_EVALUATION_INTERVAL_SECONDS: '0' },
    { ...valid, ATTENDANCE_EVALUATION_INTERVAL_SECONDS: '3601' },
  ])('rechaza configuración inválida sin mostrar credenciales', (env) => {
    expect(() => parseConfig(env)).toThrow('Configuración inválida');
    try {
      parseConfig(env);
    } catch (error) {
      expect(String(error)).not.toContain('password');
    }
  });
});

it('sanitiza URLs malformadas aunque incluyan credenciales', () => {
  const env = {
    DATABASE_URL: 'postgresql://user:review-secret@host:invalid/db',
  };
  expect(() => parseConfig(env)).toThrow('Configuración inválida');
  try {
    parseConfig(env);
  } catch (error) {
    expect(inspect(error)).not.toContain('review-secret');
  }
});

it('exige HTTPS explícito en producción para las cookies seguras', () => {
  expect(() => parseConfig({ ...valid, NODE_ENV: 'production' })).toThrow(
    'APP_ORIGIN',
  );
  expect(() =>
    parseConfig({
      ...valid,
      NODE_ENV: 'production',
      APP_ORIGIN: 'http://asistencia.example.test',
    }),
  ).toThrow('APP_ORIGIN');
  expect(
    parseConfig({
      ...valid,
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://asistencia.example.test',
    }).appOrigin,
  ).toBe('https://asistencia.example.test');
});
