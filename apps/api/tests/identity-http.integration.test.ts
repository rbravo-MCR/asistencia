import { createHash, randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Check } from 'typebox/value';
import { sql } from 'drizzle-orm';
import {
  SessionSchema,
  UserSchema,
  type EmployeeInput,
  type UserInput,
} from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import * as employeeModule from '../src/modules/employees/index.js';
import { APP_ORIGIN, login, TEST_PASSWORD } from './helpers/auth.js';

loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL debe terminar en _test.');
const control = createDatabase(source);
const databaseName = `asistencia_identity_${randomUUID().replaceAll('-', '')}_test`;
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
const identity = createIdentityService(database.db, { sessionHours: 8 });
let created = false;
let admin: Awaited<ReturnType<typeof login>>;
let adminId: string;
function userInput(roles: UserInput['roles'] = ['EMPLOYEE']): UserInput {
  return {
    email: `${randomUUID()}@example.test`,
    name: 'Persona de prueba',
    password: TEST_PASSWORD,
    active: true,
    roles,
  };
}
async function user(roles: UserInput['roles'] = ['EMPLOYEE']) {
  const input = userInput(roles);
  const record = await identity.createUser(input);
  return { ...record, password: input.password };
}
async function department() {
  const result = await server.inject({
    method: 'POST',
    url: '/api/departments',
    headers: admin.headers,
    payload: { name: `Área ${randomUUID()}` },
  });
  expect(result.statusCode).toBe(201);
  return result.json<{ id: string }>();
}
function employeeInput(
  departmentId: string,
  userId: string | null = null,
): EmployeeInput {
  return {
    employeeNumber: randomUUID().slice(0, 20),
    fullName: 'Ana Pérez',
    departmentId,
    position: 'Analista',
    joinedOn: '2024-02-29',
    category: 'ADMINISTRATIVE',
    status: 'ACTIVE',
    supervisorId: null,
    userId,
  };
}
async function employee(input: EmployeeInput) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/employees',
    headers: admin.headers,
    payload: input,
  });
  expect(response.statusCode).toBe(201);
  return response.json<EmployeeInput & { id: string }>();
}
async function assign(payload: object) {
  return server.inject({
    method: 'POST',
    url: '/api/assignments',
    headers: admin.headers,
    payload,
  });
}
beforeAll(async () => {
  await control.pool.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  await runMigrations(database.db);
  const initial = await identity.createInitialAdmin({
    email: 'initial@example.test',
    name: 'Administración de prueba',
    password: TEST_PASSWORD,
  });
  adminId = initial.id;
  admin = await login(server, initial.email);
});
afterAll(async () => {
  try {
    await server.close();
    await database.pool.end();
    if (created) await control.pool.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    await control.pool.end();
  }
});

describe('identidad HTTP con PostgreSQL aislado', () => {
  it('exige autenticación, devuelve sesión pública y cookie protegida', async () => {
    expect((await server.inject('/api/auth/session')).statusCode).toBe(401);
    expect((await server.inject('/api/employees')).statusCode).toBe(401);
    const account = await user();
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: APP_ORIGIN },
      payload: { email: account.email, password: TEST_PASSWORD },
    });
    expect(response.statusCode).toBe(200);
    expect(Check(SessionSchema, response.json())).toBe(true);
    expect(response.body).not.toMatch(/passwordHash|tokenHash|\$argon2/);
    expect(response.headers['cache-control']).toBe('no-store');
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toMatch(/asistencia_session=[^;]+/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).not.toMatch(/Domain=/i);
    const token = cookie.match(/asistencia_session=([^;]+)/)?.[1];
    const stored = await database.pool.query(
      'select token_hash from sessions where user_id = $1',
      [account.id],
    );
    expect(
      stored.rows.some(
        (row: { token_hash: string }) =>
          row.token_hash === createHash('sha256').update(token!).digest('hex'),
      ),
    ).toBe(true);
    expect(stored.rows).not.toContainEqual({ token_hash: token });
  });
  it('rechaza Origin y CSRF incorrectos sin mutar', async () => {
    const payload = { name: `Rechazado ${randomUUID()}` };
    const noCsrf = await server.inject({
      method: 'POST',
      url: '/api/departments',
      headers: { cookie: admin.cookie, origin: APP_ORIGIN },
      payload,
    });
    expect(noCsrf.statusCode).toBe(403);
    const badOrigin = await server.inject({
      method: 'POST',
      url: '/api/departments',
      headers: { ...admin.headers, origin: 'https://evil.example' },
      payload,
    });
    expect(badOrigin.statusCode).toBe(403);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/auth/login',
          headers: { origin: 'https://evil.example' },
          payload: { email: 'initial@example.test', password: TEST_PASSWORD },
        })
      ).statusCode,
    ).toBe(403);
  });
  it('no distingue cuenta desconocida, inactiva y contraseña incorrecta', async () => {
    const active = await user();
    const inactive = await identity.createUser({
      ...userInput(),
      active: false,
    });
    const responses = await Promise.all(
      [active.email, inactive.email, `${randomUUID()}@example.test`].map(
        (email) =>
          server.inject({
            method: 'POST',
            url: '/api/auth/login',
            headers: { origin: APP_ORIGIN },
            payload: { email, password: 'incorrecta' },
          }),
      ),
    );
    expect(responses.map((response) => response.statusCode)).toEqual([
      401, 401, 401,
    ]);
    expect(responses.map((response) => response.json().error.message)).toEqual(
      Array(3).fill(responses[0]!.json().error.message),
    );
  });
  it('limita login después de cinco intentos por correo e IP', async () => {
    const email = `${randomUUID()}@example.test`;
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (
          await server.inject({
            method: 'POST',
            url: '/api/auth/login',
            headers: { origin: APP_ORIGIN },
            payload: { email, password: 'incorrecta' },
          })
        ).statusCode,
      ).toBe(401);
    }
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/auth/login',
          headers: { origin: APP_ORIGIN },
          payload: { email, password: 'incorrecta' },
        })
      ).statusCode,
    ).toBe(429);
  });
  it('logout y expiración invalidan la sesión persistida', async () => {
    const account = await user();
    const session = await login(server, account.email);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/auth/logout',
          headers: session.headers,
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await server.inject({
          url: '/api/auth/session',
          headers: session.headers,
        })
      ).statusCode,
    ).toBe(401);
    const expired = await login(server, account.email);
    await database.pool.query(
      "update sessions set expires_at = now() - interval '1 second' where user_id = $1",
      [account.id],
    );
    expect(
      (
        await server.inject({
          url: '/api/auth/session',
          headers: expired.headers,
        })
      ).statusCode,
    ).toBe(401);
  });
  it('cambia contraseña y revoca todas las sesiones; recuperación es de un solo uso', async () => {
    const account = await user();
    const first = await login(server, account.email);
    const second = await login(server, account.email);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/auth/change-password',
          headers: first.headers,
          payload: {
            currentPassword: TEST_PASSWORD,
            password: 'Nueva contraseña segura 2026!',
          },
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await server.inject({
          url: '/api/auth/session',
          headers: second.headers,
        })
      ).statusCode,
    ).toBe(401);
    const recovery = await server.inject({
      method: 'POST',
      url: `/api/users/${account.id}/recovery`,
      headers: admin.headers,
    });
    expect(recovery.statusCode).toBe(200);
    const token = recovery.json<{ token: string }>().token;
    const payload = { token, password: 'Recuperada contraseña 2026!' };
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/auth/recover',
          headers: { origin: APP_ORIGIN },
          payload,
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/auth/recover',
          headers: { origin: APP_ORIGIN },
          payload,
        })
      ).statusCode,
    ).toBeGreaterThanOrEqual(400);
    await login(server, account.email, payload.password);
  });
  it('ADMIN administra usuarios, HR solo directorio y los cambios de roles revocan', async () => {
    const hr = await user(['HR']);
    const hrSession = await login(server, hr.email);
    expect(
      (await server.inject({ url: '/api/users', headers: hrSession.headers }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await server.inject({
          url: '/api/users/directory',
          headers: hrSession.headers,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/users',
          headers: hrSession.headers,
          payload: userInput(['ADMIN']),
        })
      ).statusCode,
    ).toBe(403);
    const createdUser = await server.inject({
      method: 'POST',
      url: '/api/users',
      headers: admin.headers,
      payload: userInput(),
    });
    expect(createdUser.statusCode).toBe(201);
    expect(Check(UserSchema, createdUser.json())).toBe(true);
    const update = {
      email: hr.email,
      name: hr.name,
      roles: ['EMPLOYEE'],
      active: true,
    };
    expect(
      (
        await server.inject({
          method: 'PUT',
          url: `/api/users/${hr.id}`,
          headers: admin.headers,
          payload: update,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await server.inject({
          url: '/api/auth/session',
          headers: hrSession.headers,
        })
      ).statusCode,
    ).toBe(401);
  });
  it('protege al último ADMIN activo también al inactivar su empleado vinculado', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: `/api/users/${adminId}`,
      headers: admin.headers,
      payload: {
        email: 'initial@example.test',
        name: 'Administración',
        roles: ['EMPLOYEE'],
        active: true,
      },
    });
    expect(response.statusCode).toBe(409);
    const area = await department();
    const record = await employee(employeeInput(area.id, adminId));
    const deletion = await server.inject({
      method: 'DELETE',
      url: `/api/employees/${record.id}`,
      headers: admin.headers,
    });
    expect(deletion.statusCode).toBe(409);
    expect(deletion.json().error.code).toBe('LAST_ADMIN');
    expect(
      (
        await server.inject({
          method: 'PUT',
          url: `/api/employees/${record.id}`,
          headers: admin.headers,
          payload: { ...employeeInput(area.id, adminId), status: 'INACTIVE' },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await server.inject({
          url: '/api/auth/session',
          headers: admin.headers,
        })
      ).statusCode,
    ).toBe(200);
  });
});

describe('expedientes, alcance e historial HTTP', () => {
  it('limita lectura propia y concede alcance de departamento mediante jefatura', async () => {
    const ownUser = await user();
    const ownSession = await login(server, ownUser.email);
    const area = await department();
    const otherArea = await department();
    const own = await employee(employeeInput(area.id, ownUser.id));
    const colleague = await employee(employeeInput(area.id));
    const foreign = await employee(employeeInput(otherArea.id));
    const list = await server.inject({
      url: '/api/employees',
      headers: ownSession.headers,
    });
    expect(list.json().items.map((item: { id: string }) => item.id)).toEqual([
      own.id,
    ]);
    expect(
      (
        await server.inject({
          url: `/api/employees/${foreign.id}`,
          headers: ownSession.headers,
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/employees',
          headers: ownSession.headers,
          payload: employeeInput(area.id),
        })
      ).statusCode,
    ).toBe(403);
    const head = await assign({
      kind: 'HEAD',
      employeeId: own.id,
      departmentId: area.id,
      reason: 'Titular',
    });
    expect(head.statusCode).toBe(201);
    const scoped = await server.inject({
      url: '/api/employees',
      headers: ownSession.headers,
    });
    expect(
      scoped
        .json()
        .items.map((item: { id: string }) => item.id)
        .sort(),
    ).toEqual([own.id, colleague.id].sort());
    expect(
      (
        await server.inject({
          url: `/api/employees/${foreign.id}`,
          headers: ownSession.headers,
        })
      ).statusCode,
    ).toBe(404);
  });
  it('valida fechas, unicidad, referencias y ciclos de supervisión', async () => {
    const area = await department();
    const input = employeeInput(area.id);
    const first = await employee(input);
    const second = await employee({
      ...employeeInput(area.id),
      supervisorId: first.id,
    });
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/employees',
          headers: admin.headers,
          payload: input,
        })
      ).statusCode,
    ).toBe(409);
    for (const patch of [
      { joinedOn: '2025-02-29' },
      { departmentId: randomUUID() },
      { extra: true },
      { fullName: ' ' },
      { fullName: 'Ana\u0000Pérez' },
    ]) {
      const response = await server.inject({
        method: 'POST',
        url: '/api/employees',
        headers: admin.headers,
        payload: { ...employeeInput(area.id), ...patch },
      });
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    }
    const cycle = await server.inject({
      method: 'PUT',
      url: `/api/employees/${first.id}`,
      headers: admin.headers,
      payload: { ...input, supervisorId: second.id },
    });
    expect(cycle.statusCode).toBe(409);
  });
  it('conserva historial, restringe suplencias y cierra jefatura cuando se mueve el titular', async () => {
    const area = await department();
    const another = await department();
    const first = await employee(employeeInput(area.id));
    const successor = await employee(employeeInput(area.id));
    const substituteUser = await user();
    const substitute = await employee(
      employeeInput(another.id, substituteUser.id),
    );
    const substituteSession = await login(server, substituteUser.email);
    const head = await assign({
      kind: 'HEAD',
      employeeId: first.id,
      departmentId: area.id,
      reason: 'Titular original',
    });
    expect(head.statusCode).toBe(201);
    const startsAt = new Date(Date.now() - 1000).toISOString();
    const endsAt = new Date(Date.now() + 3600000).toISOString();
    const input = {
      kind: 'SUBSTITUTE',
      employeeId: substitute.id,
      departmentId: area.id,
      startsAt,
      endsAt,
      reason: 'Cobertura explícita entre áreas',
    };
    const coverage = await assign(input);
    expect(coverage.statusCode).toBe(201);
    expect(coverage.json().sourceAssignmentId).toBe(head.json().id);
    expect((await assign(input)).statusCode).toBe(409);
    expect((await assign({ ...input, endsAt: startsAt })).statusCode).toBe(400);
    const scope = await server.inject({
      url: '/api/auth/session',
      headers: substituteSession.headers,
    });
    expect(scope.json().managedDepartmentIds).toContain(area.id);
    const replaced = await assign({
      kind: 'HEAD',
      employeeId: successor.id,
      departmentId: area.id,
      reason: 'Nuevo titular',
    });
    expect(replaced.statusCode).toBe(201);
    const history = await server.inject({
      url: '/api/assignments',
      headers: admin.headers,
    });
    expect(
      history
        .json()
        .items.find((item: { id: string }) => item.id === head.json().id)
        .endsAt,
    ).not.toBeNull();
    const closedScope = await server.inject({
      url: '/api/auth/session',
      headers: substituteSession.headers,
    });
    expect(closedScope.json().managedDepartmentIds).not.toContain(area.id);
    const successorId = successor.id;
    const successorInput = {
      employeeNumber: successor.employeeNumber,
      fullName: successor.fullName,
      departmentId: successor.departmentId,
      position: successor.position,
      joinedOn: successor.joinedOn,
      category: successor.category,
      status: successor.status,
      supervisorId: successor.supervisorId,
      userId: successor.userId,
    };
    const moved = await server.inject({
      method: 'PUT',
      url: `/api/employees/${successorId}`,
      headers: admin.headers,
      payload: { ...successorInput, departmentId: another.id },
    });
    expect(moved.statusCode).toBe(200);
    expect(
      (
        await server.inject({
          method: 'DELETE',
          url: `/api/assignments/${coverage.json().id}`,
          headers: admin.headers,
        })
      ).statusCode,
    ).toBe(204);
  });
  it('director concede lectura global sin conceder administración', async () => {
    const account = await user();
    const area = await department();
    const record = await employee(employeeInput(area.id, account.id));
    expect(
      (
        await assign({
          kind: 'DIRECTOR',
          employeeId: record.id,
          departmentId: null,
          reason: 'Dirección',
        })
      ).statusCode,
    ).toBe(201);
    const session = await login(server, account.email);
    expect(session.session.permissions.viewAllEmployees).toBe(true);
    expect(session.session.permissions.manageOrganization).toBe(false);
    expect(
      (await server.inject({ url: '/api/users', headers: session.headers }))
        .statusCode,
    ).toBe(403);
    const inactive = await server.inject({
      method: 'PUT',
      url: `/api/employees/${record.id}`,
      headers: admin.headers,
      payload: { ...employeeInput(area.id, account.id), status: 'INACTIVE' },
    });
    expect(inactive.statusCode).toBe(200);
    expect(
      (
        await server.inject({
          url: '/api/auth/session',
          headers: session.headers,
        })
      ).statusCode,
    ).toBe(401);
  });
});

describe('invariantes concurrentes y suplencias acotadas', () => {
  it('serializa nombramientos concurrentes y conserva un solo titular vigente', async () => {
    const area = await department();
    const first = await employee(employeeInput(area.id));
    const second = await employee(employeeInput(area.id));
    const results = await Promise.all(
      [first, second].map((record) =>
        assign({
          kind: 'HEAD',
          employeeId: record.id,
          departmentId: area.id,
          reason: 'Nombramiento concurrente',
        }),
      ),
    );
    expect(results.map((result) => result.statusCode)).toEqual([201, 201]);
    const current = await database.pool.query(
      'select count(*)::int as count from organization_assignments where department_id = $1 and kind = $2 and ends_at is null and revoked_at is null',
      [area.id, 'HEAD'],
    );
    expect(current.rows).toEqual([{ count: 1 }]);
  });
  it('exige una suplencia finita y distinta del titular, permite intervalos adyacentes', async () => {
    const area = await department();
    const head = await employee(employeeInput(area.id));
    const substitute = await employee(employeeInput(area.id));
    expect(
      (
        await assign({
          kind: 'HEAD',
          employeeId: head.id,
          departmentId: area.id,
          reason: 'Titular',
        })
      ).statusCode,
    ).toBe(201);
    const startsAt = new Date(Date.now() + 86400000).toISOString();
    const endsAt = new Date(Date.now() + 90000000).toISOString();
    const nextEnd = new Date(Date.now() + 93600000).toISOString();
    const input = {
      kind: 'SUBSTITUTE',
      employeeId: substitute.id,
      departmentId: area.id,
      startsAt,
      endsAt,
      reason: 'Cobertura',
    };
    for (const payload of [
      { ...input, endsAt: null },
      { ...input, employeeId: head.id },
      { ...input, reason: ' ' },
    ]) {
      const response = await assign(payload);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    }
    const results = await Promise.all([assign(input), assign(input)]);
    expect(results.map((result) => result.statusCode).sort()).toEqual([
      201, 409,
    ]);
    expect(
      (await assign({ ...input, startsAt: endsAt, endsAt: nextEnd }))
        .statusCode,
    ).toBe(201);
  });
});

it('un empleado sin responsabilidad no recibe historial ajeno de su departamento', async () => {
  const account = await user();
  const session = await login(server, account.email);
  const area = await department();
  await employee(employeeInput(area.id, account.id));
  const head = await employee(employeeInput(area.id));
  const assignment = await assign({
    kind: 'HEAD',
    employeeId: head.id,
    departmentId: area.id,
    reason: 'Motivo privado de nombramiento',
  });
  expect(assignment.statusCode).toBe(201);
  const response = await server.inject({
    url: '/api/assignments',
    headers: session.headers,
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().items).toEqual([]);
});
it('inactivar y desvincular revoca también la cuenta previamente vinculada', async () => {
  const account = await user(['HR']);
  const session = await login(server, account.email);
  const area = await department();
  const input = employeeInput(area.id, account.id);
  const record = await employee(input);
  const response = await server.inject({
    method: 'PUT',
    url: `/api/employees/${record.id}`,
    headers: admin.headers,
    payload: { ...input, status: 'INACTIVE', userId: null },
  });
  expect(response.statusCode).toBe(200);
  expect(
    (
      await server.inject({
        url: '/api/auth/session',
        headers: session.headers,
      })
    ).statusCode,
  ).toBe(401);
  const stored = await database.pool.query(
    'select active from users where id = $1',
    [account.id],
  );
  expect(stored.rows).toEqual([{ active: false }]);
});
it('desvincular al inactivar tampoco permite retirar al último ADMIN', async () => {
  const linked = await database.pool.query(
    'select id, department_id from employees where user_id = $1',
    [adminId],
  );
  expect(linked.rows).toHaveLength(1);
  const row = linked.rows[0];
  const response = await server.inject({
    method: 'PUT',
    url: `/api/employees/${row.id}`,
    headers: admin.headers,
    payload: {
      ...employeeInput(row.department_id),
      status: 'INACTIVE',
      userId: null,
    },
  });
  expect(response.statusCode).toBe(409);
  expect(
    (await server.inject({ url: '/api/auth/session', headers: admin.headers }))
      .statusCode,
  ).toBe(200);
});

it('permite ingresar desde el alias localhost únicamente en desarrollo', async () => {
  const account = await user();
  for (const [mode, expected] of [
    ['development', 200],
    ['production', 403],
  ] as const) {
    const app = buildApp(
      parseConfig({
        DATABASE_URL: url.toString(),
        NODE_ENV: mode,
        APP_ORIGIN:
          mode === 'production'
            ? 'https://asistencia.example.test'
            : 'http://127.0.0.1:5173',
        LOG_LEVEL: 'silent',
      }),
    );
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { origin: 'http://localhost:5173' },
        payload: { email: account.email, password: TEST_PASSWORD },
      });
      expect(response.statusCode).toBe(expected);
    } finally {
      await app.close();
    }
  }
});

it('admite 6 caracteres en alta, cambio y recuperación y rechaza 5', async () => {
  const input = { ...userInput(), password: 'abc123' };
  const create = (password: string) =>
    server.inject({
      method: 'POST',
      url: '/api/users',
      headers: admin.headers,
      payload: { ...input, password },
    });
  expect((await create('abc12')).statusCode).toBe(400);
  const created = await create(input.password);
  expect(created.statusCode).toBe(201);
  const id = created.json<{ id: string }>().id;
  const first = await login(server, input.email, input.password);
  const change = (password: string) =>
    server.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: first.headers,
      payload: { currentPassword: input.password, password },
    });
  expect((await change('def45')).statusCode).toBe(400);
  expect((await change('def456')).statusCode).toBe(204);
  await login(server, input.email, 'def456');
  const { token } = await identity.issueRecovery(id);
  const recover = (password: string) =>
    server.inject({
      method: 'POST',
      url: '/api/auth/recover',
      headers: { origin: APP_ORIGIN },
      payload: { token, password },
    });
  expect((await recover('ghi78')).statusCode).toBe(400);
  expect((await recover('ghi789')).statusCode).toBe(204);
  await login(server, input.email, 'ghi789');
});

it('genera números consecutivos persistentes sin repetirlos bajo concurrencia', async () => {
  expect(employeeModule).toHaveProperty('generateEmployeeNumber');
  const first = await employeeModule.generateEmployeeNumber(database.db);
  const second = await employeeModule.generateEmployeeNumber(database.db);
  expect(first).toMatch(/^\d{6,30}$/);
  expect(BigInt(second)).toBe(BigInt(first) + 1n);
  const values = await Promise.all(
    Array.from({ length: 15 }, () =>
      employeeModule.generateEmployeeNumber(database.db),
    ),
  );
  expect(new Set(values).size).toBe(values.length);
  const sorted = values.map(BigInt).sort((a, b) => (a < b ? -1 : 1));
  expect(sorted[0]).toBe(BigInt(second) + 1n);
  expect(sorted.at(-1)).toBe(BigInt(second) + 15n);
  const otherConnection = createDatabase(url.toString());
  try {
    const next = await employeeModule.generateEmployeeNumber(
      otherConnection.db,
    );
    expect(BigInt(next)).toBe(BigInt(second) + 16n);
  } finally {
    await otherConnection.pool.end();
  }
  await database.db.transaction(async (tx) => {
    await tx.execute(
      sql`update employee_number_counter set last_value = 999998 where id = 1`,
    );
    expect(await employeeModule.generateEmployeeNumber(tx)).toBe('1000000');
  });
});

it('genera el número en altas sin número y conserva los números existentes', async () => {
  const dep = await department();
  const input = employeeInput(dep.id);
  const automatic = { ...input, employeeNumber: undefined };
  const legacyNumber = '9000000';
  const legacy = await employee({ ...input, employeeNumber: legacyNumber });
  const create = (body: object) =>
    server.inject({
      method: 'POST',
      url: '/api/employees',
      headers: admin.headers,
      payload: body,
    });
  const response = await create(automatic);
  expect(response.statusCode).toBe(201);
  expect(response.json().employeeNumber).toBe('9000001');
  expect(response.json().userId).toBeNull();
  const stored = await database.pool.query(
    'select employee_number from employees where id=$1',
    [legacy.id],
  );
  expect(stored.rows[0].employee_number).toBe(legacyNumber);
  expect((await create({ ...automatic, employeeNumber: '' })).statusCode).toBe(
    400,
  );
  const responses = await Promise.all(
    Array.from({ length: 5 }, () => create(automatic)),
  );
  expect(responses.map((item) => item.statusCode)).toEqual(Array(5).fill(201));
  expect(
    new Set(responses.map((item) => item.json().employeeNumber)).size,
  ).toBe(5);
  const update = await server.inject({
    method: 'PUT',
    url: `/api/employees/${response.json().id}`,
    headers: admin.headers,
    payload: automatic,
  });
  expect(update.statusCode).toBe(400);
});

it('permite ingresar al administrador con 999999 sin cambiar su contraseña', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: APP_ORIGIN },
    payload: { identifier: '999999', password: TEST_PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().user.id).toBe(adminId);
  const wrong = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: APP_ORIGIN },
    payload: { identifier: '999999', password: 'incorrecta' },
  });
  expect(wrong.statusCode).toBe(401);
});

it('elimina expedientes sin historial, desactiva su cuenta y exige autorización', async () => {
  const dep = await department();
  const account = await user();
  const linked = await employee(employeeInput(dep.id, account.id));
  const active = await login(server, account.email);
  const path = `/api/employees/${linked.id}`;
  expect(
    (await server.inject({ method: 'DELETE', url: path })).statusCode,
  ).toBe(401);
  expect(
    (
      await server.inject({
        method: 'DELETE',
        url: path,
        headers: active.headers,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await server.inject({
        method: 'DELETE',
        url: path,
        headers: { cookie: admin.headers.cookie, origin: APP_ORIGIN },
      })
    ).statusCode,
  ).toBe(403);
  const removed = await server.inject({
    method: 'DELETE',
    url: path,
    headers: admin.headers,
  });
  expect(removed.statusCode).toBe(204);
  expect(removed.body).toBe('');
  expect(
    (
      await database.pool.query('select id from employees where id=$1', [
        linked.id,
      ])
    ).rows,
  ).toEqual([]);
  expect(
    (
      await database.pool.query('select active from users where id=$1', [
        account.id,
      ])
    ).rows,
  ).toEqual([{ active: false }]);
  expect(
    (await server.inject({ url: '/api/auth/session', headers: active.headers }))
      .statusCode,
  ).toBe(401);
  expect(
    (
      await server.inject({
        method: 'DELETE',
        url: path,
        headers: admin.headers,
      })
    ).statusCode,
  ).toBe(404);
});

it('no elimina empleados con subordinados ni historial y revierte la desactivación', async () => {
  const dep = await department();
  const account = await user();
  const head = await employee(employeeInput(dep.id, account.id));
  await employee({ ...employeeInput(dep.id), supervisorId: head.id });
  const remove = () =>
    server.inject({
      method: 'DELETE',
      url: `/api/employees/${head.id}`,
      headers: admin.headers,
    });
  expect((await remove()).statusCode).toBe(409);
  expect(
    (
      await database.pool.query('select active from users where id=$1', [
        account.id,
      ])
    ).rows,
  ).toEqual([{ active: true }]);
  const member = await employee(employeeInput(dep.id));
  const assignment = await assign({
    kind: 'HEAD',
    employeeId: member.id,
    departmentId: dep.id,
    reason: 'Historial protegido',
  });
  expect(assignment.statusCode).toBe(201);
  await server.inject({
    method: 'DELETE',
    url: `/api/assignments/${assignment.json().id}`,
    headers: admin.headers,
  });
  const blocked = await server.inject({
    method: 'DELETE',
    url: `/api/employees/${member.id}`,
    headers: admin.headers,
  });
  expect(blocked.statusCode).toBe(409);
  expect(blocked.json().error.code).toBe('EMPLOYEE_IN_USE');
  expect(
    (
      await database.pool.query('select id from employees where id=$1', [
        member.id,
      ])
    ).rowCount,
  ).toBe(1);
});

it('persiste celular y dirección, valida límites y conserva campos omitidos al editar', async () => {
  const dep = await department();
  const input = {
    ...employeeInput(dep.id),
    phoneNumber: ' +52 (999) 123-4567 ',
    address: '  Calle 10 #20, Me\u0301rida  ',
  };
  const response = await server.inject({
    method: 'POST',
    url: '/api/employees',
    headers: admin.headers,
    payload: input,
  });
  expect(response.statusCode).toBe(201);
  const record = response.json();
  expect(record.phoneNumber).toBe('+529991234567');
  expect(record.address).toBe('Calle 10 #20, Mérida');
  const stored = await database.pool.query(
    'select phone_number, address from employees where id=$1',
    [record.id],
  );
  expect(stored.rows).toEqual([
    { phone_number: '+529991234567', address: 'Calle 10 #20, Mérida' },
  ]);
  const update = (patch: object) =>
    server.inject({
      method: 'PUT',
      url: `/api/employees/${record.id}`,
      headers: admin.headers,
      payload: {
        ...employeeInput(dep.id),
        employeeNumber: record.employeeNumber,
        ...patch,
      },
    });
  expect((await update({ position: 'Coordinación' })).json().phoneNumber).toBe(
    '+529991234567',
  );
  expect(
    (
      await update({ phoneNumber: '9997654321', address: 'Nueva dirección' })
    ).json(),
  ).toMatchObject({ phoneNumber: '9997654321', address: 'Nueva dirección' });
  for (const patch of [
    { phoneNumber: '123' },
    { phoneNumber: 'abc9991234567' },
    { phoneNumber: '1'.repeat(16) },
    { address: 'a'.repeat(501) },
    { address: 'Texto\u0000inválido' },
  ])
    expect((await update(patch)).statusCode).toBe(400);
  expect(
    (await update({ phoneNumber: null, address: null })).json(),
  ).toMatchObject({ phoneNumber: null, address: null });
  const legacy = await employee(employeeInput(dep.id));
  expect(legacy).toMatchObject({ phoneNumber: null, address: null });
});
