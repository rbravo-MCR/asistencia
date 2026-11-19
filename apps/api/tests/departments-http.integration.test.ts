import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Check } from 'typebox/value';
import {
  DepartmentSchema,
  DepartmentListSchema,
  ErrorSchema,
} from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { APP_ORIGIN, login, TEST_PASSWORD } from './helpers/auth.js';

loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL debe terminar en _test.');
const admin = createDatabase(source);
const databaseName = `asistencia_http_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(source);
url.pathname = `/${databaseName}`;
const database = createDatabase(url.toString());
const server = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
let created = false;
let auth: Awaited<ReturnType<typeof login>>;
beforeAll(async () => {
  await admin.pool.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  await runMigrations(database.db);
  await createIdentityService(database.db, {
    sessionHours: 8,
  }).createInitialAdmin({
    email: 'departments@example.test',
    name: 'Administración',
    password: TEST_PASSWORD,
  });
  auth = await login(server, 'departments@example.test');
});
afterAll(async () => {
  try {
    await server.close();
    await database.pool.end();
    if (created) await admin.pool.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    await admin.pool.end();
  }
});
function post(body: unknown) {
  return server.inject({
    method: 'POST',
    url: '/api/departments',
    headers: { ...auth.headers, 'content-type': 'application/json' },
    payload: JSON.stringify(body),
  });
}

describe('API de Departamentos con PostgreSQL', () => {
  it('devuelve una lista vacía válida antes de crear departamentos', async () => {
    const response = await server.inject({
      url: '/api/departments',
      headers: auth.headers,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [] });
    expect(Check(DepartmentListSchema, response.json())).toBe(true);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('crea un departamento y lo devuelve persistido al consultar', async () => {
    const response = await post({ name: '  Administración  ' });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(Check(DepartmentSchema, body)).toBe(true);
    expect(body.name).toBe('Administración');
    expect(body.createdAt).toMatch(/\.\d{3}Z$/);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['cache-control']).toBe('no-store');
    const listed = await server.inject({
      url: '/api/departments',
      headers: auth.headers,
    });
    expect(listed.json().items).toContainEqual(body);
    const persisted = await database.pool.query(
      'select name from departments where id = $1',
      [body.id],
    );
    expect(persisted.rows).toEqual([{ name: 'Administración' }]);
  });
  it('devuelve conflicto sin duplicar departamentos', async () => {
    const response = await post({ name: 'administración' });
    expect(response.statusCode).toBe(409);
    expect(Check(ErrorSchema, response.json())).toBe(true);
    expect(response.json().error.code).toBe('DEPARTMENT_NAME_EXISTS');
    const result = await database.pool.query(
      'select count(*)::int as count from departments',
    );
    expect(result.rows).toEqual([{ count: 1 }]);
  });
  it.each([
    {},
    { name: '' },
    { name: ' \t ' },
    { name: 42 },
    { name: true },
    { name: null },
    { name: ['Nombre'] },
    { name: 'válido', extra: true },
    { name: 'a'.repeat(101) },
    { name: 'RR\u0000HH' },
    null,
    [],
  ])(
    'rechaza datos inválidos sin convertirlos ni eliminar campos',
    async (input) => {
      const response = await post(input);
      expect(response.statusCode).toBe(400);
      expect(Check(ErrorSchema, response.json())).toBe(true);
      const count = await database.pool.query(
        'select count(*)::int as count from departments',
      );
      expect(count.rows).toEqual([{ count: 1 }]);
    },
  );
  it('acepta cien caracteres después de NFC y trim', async () => {
    const canonical = 'Á'.repeat(64) + randomUUID();
    const response = await post({ name: ` ${canonical.normalize('NFD')} ` });
    expect(response.statusCode).toBe(201);
    expect(response.json().name).toBe(canonical);
    expect(Check(DepartmentSchema, response.json())).toBe(true);
  });
  it('resuelve concurrencia con 201 y 409', async () => {
    const value = `Equipo ${randomUUID()}`;
    const results = await Promise.all([
      post({ name: value }),
      post({ name: value.toUpperCase() }),
    ]);
    expect(results.map((response) => response.statusCode).sort()).toEqual([
      201, 409,
    ]);
  });
  it('normaliza JSON malformado y tipo de contenido no admitido', async () => {
    const invalid = await server.inject({
      method: 'POST',
      url: '/api/departments',
      headers: { ...auth.headers, 'content-type': 'application/json' },
      payload: '{',
    });
    expect(invalid.statusCode).toBe(400);
    expect(Check(ErrorSchema, invalid.json())).toBe(true);
    const unsupported = await server.inject({
      method: 'POST',
      url: '/api/departments',
      headers: { ...auth.headers, 'content-type': 'application/xml' },
      payload: '<name>Equipo</name>',
    });
    expect(unsupported.statusCode).toBe(415);
  });
  it('documenta GET, POST y sus errores en OpenAPI', async () => {
    const response = await server.inject('/docs/json');
    const routes = response.json().paths['/api/departments'];
    expect(routes).toHaveProperty('get');
    expect(routes.post.responses).toHaveProperty('201');
    expect(routes.post.responses).toHaveProperty('400');
    expect(routes.post.responses).toHaveProperty('409');
  });
  it('oculta detalles de conexión cuando falla PostgreSQL', async () => {
    const unavailable = buildApp(
      parseConfig({
        DATABASE_URL:
          'postgresql://local:secret-http@127.0.0.1:1/isolated_test',
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
      }),
    );
    try {
      for (const method of ['GET', 'POST'] as const) {
        const response = await unavailable.inject({
          method,
          url: '/api/departments',
          headers: auth.headers,
          ...(method === 'POST' ? { payload: { name: 'Prueba' } } : {}),
        });
        expect(response.statusCode).toBe(500);
        expect(Check(ErrorSchema, response.json())).toBe(true);
        expect(response.body).not.toMatch(
          /secret-http|postgresql|ECONNREFUSED|select|insert/i,
        );
      }
    } finally {
      await unavailable.close();
    }
  });
});

it('actualiza y elimina departamentos con validación y persistencia', async () => {
  const first = (await post({ name: `Editar ${randomUUID()}` })).json();
  const second = (await post({ name: `Duplicado ${randomUUID()}` })).json();
  const update = (id: string, body: object) =>
    server.inject({
      method: 'PUT',
      url: `/api/departments/${id}`,
      headers: auth.headers,
      payload: body,
    });
  const response = await update(first.id, { name: '  Nuevo nombre  ' });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ ...first, name: 'Nuevo nombre' });
  expect(
    (await update(first.id, { name: second.name.toUpperCase() })).statusCode,
  ).toBe(409);
  for (const body of [
    { name: '' },
    { name: 'a'.repeat(101) },
    { name: 'Válido', extra: true },
  ]) {
    expect((await update(first.id, body)).statusCode).toBe(400);
  }
  expect((await update(randomUUID(), { name: 'Inexistente' })).statusCode).toBe(
    404,
  );
  const removed = await server.inject({
    method: 'DELETE',
    url: `/api/departments/${first.id}`,
    headers: auth.headers,
  });
  expect(removed.statusCode).toBe(204);
  expect(removed.body).toBe('');
  expect(
    (
      await database.pool.query('select id from departments where id=$1', [
        first.id,
      ])
    ).rows,
  ).toEqual([]);
  expect(
    (
      await server.inject({
        method: 'DELETE',
        url: `/api/departments/${first.id}`,
        headers: auth.headers,
      })
    ).statusCode,
  ).toBe(404);
});

it('protege update/delete con sesión, rol, CSRF y referencias de PostgreSQL', async () => {
  const dep = (await post({ name: `Protegido ${randomUUID()}` })).json();
  const service = createIdentityService(database.db, { sessionHours: 8 });
  const employee = await service.createUser({
    email: `${randomUUID()}@example.test`,
    name: 'Empleado',
    password: TEST_PASSWORD,
    roles: ['EMPLOYEE'],
    active: true,
  });
  const employeeAuth = await login(server, employee.email);
  for (const method of ['PUT', 'DELETE'] as const) {
    const request = {
      method,
      url: `/api/departments/${dep.id}`,
      ...(method === 'PUT' ? { payload: { name: 'Cambio' } } : {}),
    };
    expect((await server.inject(request)).statusCode).toBe(401);
    expect(
      (await server.inject({ ...request, headers: employeeAuth.headers }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await server.inject({
          ...request,
          headers: { cookie: auth.headers.cookie, origin: APP_ORIGIN },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await server.inject({
          ...request,
          url: '/api/departments/no-uuid',
          headers: auth.headers,
        })
      ).statusCode,
    ).toBe(400);
  }
  const hr = await service.createUser({
    email: `${randomUUID()}@example.test`,
    name: 'Recursos Humanos',
    password: TEST_PASSWORD,
    roles: ['HR'],
    active: true,
  });
  const hrAuth = await login(server, hr.email);
  expect(
    (
      await server.inject({
        method: 'PUT',
        url: `/api/departments/${dep.id}`,
        headers: hrAuth.headers,
        payload: { name: `HR ${randomUUID()}` },
      })
    ).statusCode,
  ).toBe(200);
  await database.pool.query(
    "insert into employees (employee_number, full_name, department_id, position, joined_on, category) values ($1, 'Referencia', $2, 'Analista', '2026-11-01', 'ADMINISTRATIVE')",
    [randomUUID().slice(0, 20), dep.id],
  );
  const blocked = await server.inject({
    method: 'DELETE',
    url: `/api/departments/${dep.id}`,
    headers: hrAuth.headers,
  });
  expect(blocked.statusCode).toBe(409);
  expect(blocked.json().error.code).toBe('DEPARTMENT_IN_USE');
  expect(
    (
      await database.pool.query('select id from departments where id=$1', [
        dep.id,
      ])
    ).rowCount,
  ).toBe(1);
});
