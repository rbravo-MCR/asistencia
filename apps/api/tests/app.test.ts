import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';

const config = parseConfig({
  DATABASE_URL:
    'postgresql://local:private-password@127.0.0.1:1/asistencia_test',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
});
const apps: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
function app() {
  const server = buildApp(config);
  apps.push(server);
  return server;
}

describe('API de infraestructura', () => {
  it('liveness funciona sin depender de PostgreSQL y no refleja IDs enviados por el cliente', async () => {
    const response = await app().inject({
      url: '/api/health/live',
      headers: { 'x-request-id': 'untrusted' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['x-request-id']).not.toBe('untrusted');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
  it('readiness devuelve 503 si PostgreSQL no está disponible y no filtra secretos', async () => {
    const response = await app().inject('/api/health/ready');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: 'unavailable',
      database: 'unavailable',
    });
    expect(response.body).not.toMatch(
      /private-password|postgresql|ECONNREFUSED/,
    );
  });
  it('rutas desconocidas devuelven un error coherente', async () => {
    const response = await app().inject('/no-existe');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Recurso no encontrado.',
        requestId: response.headers['x-request-id'],
      },
    });
  });
  it('no expone mensajes internos en errores 500', async () => {
    const server = app();
    server.get('/explode', () => {
      throw new Error('private-password');
    });
    const response = await server.inject('/explode');
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('INTERNAL_ERROR');
    expect(response.body).not.toContain('private-password');
  });
  it('normaliza errores de validación HTTP', async () => {
    const server = app();
    server.get(
      '/validate',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['count'],
            properties: { count: { type: 'integer', minimum: 1 } },
          },
        },
      },
      () => ({ ok: true }),
    );
    const response = await server.inject('/validate?count=invalid');
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('expone OpenAPI y Swagger UI en desarrollo', async () => {
    const server = app();
    const response = await server.inject('/docs/json');
    expect(response.statusCode).toBe(200);
    expect(response.json().paths).toHaveProperty('/api/health/ready');
    expect((await server.inject('/docs/')).statusCode).toBe(200);
  });
  it('no expone documentación en producción', async () => {
    const server = buildApp({ ...config, nodeEnv: 'production' });
    apps.push(server);
    expect((await server.inject('/docs/json')).statusCode).toBe(404);
  });
});
