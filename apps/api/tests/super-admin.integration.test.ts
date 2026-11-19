import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { withAuditContext } from '../src/modules/audit/index.js';
import { createEmployeeService } from '../src/modules/employees/index.js';
import { employees } from '../src/modules/employees/schema.js';
import { departments } from '../src/modules/departments/schema.js';
import { users, userRoles } from '../src/modules/identity/schema.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Require _test');
const control = createDatabase(source),
  name = `super_${randomUUID().replaceAll('-', '')}_test`,
  url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString()),
  identity = createIdentityService(database.db);
const app = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
let made = false,
  departmentId: string,
  rootId: string,
  ownerEmployeeId: string,
  otherEmployeeId: string;
let root: Awaited<ReturnType<typeof login>>,
  admin: typeof root,
  hr: typeof root;
async function user(label: string, roles: ('ADMIN' | 'HR' | 'EMPLOYEE')[]) {
  return identity.createUser({
    email: `${label}@example.test`,
    name: label,
    password: TEST_PASSWORD,
    active: true,
    roles,
  });
}
async function employee(userId: string, label: string) {
  return (
    await database.db
      .insert(employees)
      .values({
        employeeNumber: label,
        fullName: label,
        departmentId,
        position: 'Test',
        joinedOn: '2020-01-01',
        category: 'ADMINISTRATIVE',
        userId,
      })
      .returning()
  )[0]!;
}
beforeAll(async () => {
  await control.pool.query(`create database "${name}"`);
  made = true;
  await runMigrations(database.db);
  const [d] = await database.db
    .insert(departments)
    .values({ name: 'Accesos' })
    .returning();
  departmentId = d!.id;
  const owner = await user('Owner', ['ADMIN']);
  rootId = owner.id;
  // Trusted setup seeds the owner in this isolated database, never through a permissive API.
  await database.db.delete(userRoles).where(eq(userRoles.userId, rootId));
  await database.db
    .insert(userRoles)
    .values({ userId: rootId, role: 'SUPER_ADMIN' });
  ownerEmployeeId = (await employee(rootId, 'Owner')).id;
  const a = await user('Admin', ['ADMIN']),
    h = await user('HR', ['HR']);
  await employee(a.id, 'Admin');
  await employee(h.id, 'HR');
  const ordinary = await user('Other', ['EMPLOYEE']);
  otherEmployeeId = (await employee(ordinary.id, 'Other')).id;
  root = await login(app, 'Owner@example.test');
  admin = await login(app, 'Admin@example.test');
  hr = await login(app, 'HR@example.test');
});
afterAll(async () => {
  await app.close();
  await database.pool.end();
  try {
    if (made) await control.pool.query(`drop database "${name}"`);
  } finally {
    await control.pool.end();
  }
});
const userPayload = (roles: string[] = ['SUPER_ADMIN']) => ({
  email: 'new@example.test',
  name: 'New',
  password: TEST_PASSWORD,
  active: true,
  roles,
});
const ownerUpdate = () => ({
  email: root.session.user.email,
  name: 'Owner',
  active: true,
  roles: ['SUPER_ADMIN'],
});
it('grants SUPER_ADMIN full technical scope without retaining ADMIN and without labor bypass', async () => {
  expect(root.session.user.roles).toEqual(['SUPER_ADMIN']);
  expect(root.session.permissions).toEqual({
    manageUsers: true,
    manageOrganization: true,
    viewAllEmployees: true,
  });
  for (const path of [
    '/api/users',
    '/api/employees',
    '/api/audit-events',
    '/api/configuration/status',
    '/api/dashboard',
  ])
    expect(
      (await app.inject({ url: path, headers: root.headers })).statusCode,
    ).toBe(200);
  const response = await app.inject({
    method: 'PUT',
    url: '/api/attendance/policy',
    headers: root.headers,
    payload: {
      lateToleranceMinutes: 10,
      earlyEntryMinutes: 30,
      lateExitMinutes: 120,
    },
  });
  expect(response.statusCode).toBe(200);
  expect(
    (await app.inject({ url: '/api/requests', headers: root.headers })).json()
      .items,
  ).toEqual([]);
});
it('rejects forged SUPER_ADMIN creation by ADMIN and permits it only to an active super administrator', async () => {
  const denied = await app.inject({
    method: 'POST',
    url: '/api/users',
    headers: admin.headers,
    payload: userPayload(),
  });
  expect(denied.statusCode).toBe(403);
  expect(denied.json().error.code).toBe('SUPER_ADMIN_REQUIRED');
  const allowed = await app.inject({
    method: 'POST',
    url: '/api/users',
    headers: root.headers,
    payload: userPayload(),
  });
  expect(allowed.statusCode).toBe(201);
  expect(allowed.json().roles).toEqual(['SUPER_ADMIN']);
  // Remove only this test's additional owner to preserve the last-owner scenarios below.
  await database.db.delete(users).where(eq(users.id, allowed.json().id));
});
it('prevents ordinary ADMIN from modifying, downgrading or recovering a protected account', async () => {
  for (const payload of [
    ownerUpdate(),
    { ...ownerUpdate(), roles: ['ADMIN'] },
    { ...ownerUpdate(), active: false },
  ]) {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/users/${rootId}`,
      headers: admin.headers,
      payload,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('SUPER_ADMIN_REQUIRED');
  }
  const recovery = await app.inject({
    method: 'POST',
    url: `/api/users/${rootId}/recovery`,
    headers: admin.headers,
  });
  expect(recovery.statusCode).toBe(403);
  expect(
    (await identity.listUsers()).find((u) => u.id === rootId)?.roles,
  ).toEqual(['SUPER_ADMIN']);
});
it('prevents indirect deactivation, edits, unlinking and deletion through employee administration', async () => {
  const e = (
    await database.db
      .select()
      .from(employees)
      .where(eq(employees.id, ownerEmployeeId))
  )[0]!;
  const payload = {
    employeeNumber: e.employeeNumber,
    fullName: e.fullName,
    departmentId: e.departmentId,
    position: e.position,
    joinedOn: e.joinedOn,
    category: e.category,
    status: e.status,
    supervisorId: e.supervisorId,
    userId: e.userId,
  };
  for (const session of [admin, hr]) {
    for (const change of [
      { status: 'INACTIVE' },
      { userId: null },
      { fullName: 'Changed' },
      { supervisorId: otherEmployeeId },
    ]) {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/employees/${e.id}`,
        headers: session.headers,
        payload: { ...payload, ...change },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('SUPER_ADMIN_REQUIRED');
    }
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/employees/${e.id}`,
          headers: session.headers,
        })
      ).statusCode,
    ).toBe(403);
  }
  expect(
    (
      await database.db.select().from(employees).where(eq(employees.id, e.id))
    )[0],
  ).toEqual(e);
  expect(
    (await database.db.select().from(users).where(eq(users.id, rootId)))[0]!
      .active,
  ).toBe(true);
});
it('protects the last active SUPER_ADMIN even when other ADMIN accounts exist', async () => {
  for (const payload of [
    { ...ownerUpdate(), roles: ['ADMIN'] },
    { ...ownerUpdate(), active: false },
  ]) {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/users/${rootId}`,
      headers: root.headers,
      payload,
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('LAST_SUPER_ADMIN');
  }
  const employee = (
    await database.db
      .select()
      .from(employees)
      .where(eq(employees.id, ownerEmployeeId))
  )[0]!;
  const response = await app.inject({
    method: 'PUT',
    url: `/api/employees/${employee.id}`,
    headers: root.headers,
    payload: {
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      departmentId: employee.departmentId,
      position: employee.position,
      joinedOn: employee.joinedOn,
      category: employee.category,
      status: 'INACTIVE',
      supervisorId: employee.supervisorId,
      userId: employee.userId,
    },
  });
  expect(response.statusCode).toBe(409);
  expect(response.json().error.code).toBe('LAST_SUPER_ADMIN');
});
it('retains bootstrap protection when the only technical role is SUPER_ADMIN', async () => {
  await database.pool.query(
    "update users set active=false where id<>$1 and id in(select user_id from user_roles where role='ADMIN')",
    [rootId],
  );
  try {
    await expect(
      identity.createInitialAdmin({
        email: 'bootstrap@example.test',
        name: 'Bootstrap',
        password: TEST_PASSWORD,
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_EXISTS' });
  } finally {
    await database.pool.query(
      "update users set active=true where id<>$1 and id in(select user_id from user_roles where role='ADMIN')",
      [rootId],
    );
  }
});
it('allows controlled local recovery of a super administrator without enabling HTTP ADMIN recovery', async () => {
  const result = await identity.issueRecovery(rootId, rootId);
  expect(result.token.length).toBeGreaterThan(30);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: `/api/users/${rootId}/recovery`,
        headers: admin.headers,
      })
    ).statusCode,
  ).toBe(403);
});
it('protects organizational responsibilities from replacement through an unprotected successor', async () => {
  const service = createEmployeeService(database.db);
  const assignment = await withAuditContext(
    { requestId: randomUUID(), actorId: rootId },
    () =>
      service.assign(
        {
          kind: 'HEAD',
          employeeId: ownerEmployeeId,
          departmentId,
          reason: 'Head protegida',
        },
        rootId,
      ),
  );
  const response = await app.inject({
    method: 'POST',
    url: '/api/assignments',
    headers: admin.headers,
    payload: {
      kind: 'HEAD',
      employeeId: otherEmployeeId,
      departmentId,
      reason: 'Reemplazo indirecto',
    },
  });
  expect(response.statusCode).toBe(403);
  expect(
    (
      await database.pool.query(
        'select ends_at,revoked_at from organization_assignments where id=$1',
        [assignment.id],
      )
    ).rows[0],
  ).toEqual({ ends_at: null, revoked_at: null });
});
it('supports SUPER-only leave configuration but never substitutes for an assigned labor head', async () => {
  const policy = await app.inject({
    method: 'PUT',
    url: '/api/leave/policy',
    headers: root.headers,
    payload: {
      name: 'Super configuración aislada',
      entitlements: [{ fromYear: 1, days: 12 }],
      administrativeWeekdays: [1, 2, 3, 4, 5],
      operationalWeekdays: [1, 2, 3, 4, 5],
      excludeHolidays: true,
      idempotencyKey: randomUUID(),
    },
  });
  expect(policy.statusCode).toBe(200);
  const type = await app.inject({
    method: 'POST',
    url: '/api/leave/permission-types',
    headers: root.headers,
    payload: {
      name: 'Permiso aislado',
      paid: true,
      evidenceRequired: false,
      allowPartial: true,
      active: true,
      idempotencyKey: randomUUID(),
    },
  });
  expect(type.statusCode).toBe(200);
  const organization = createEmployeeService(database.db);
  // Root currently holds HEAD from the replacement-protection test; replace it through the authorized SUPER.
  const assignment = await withAuditContext(
    { requestId: randomUUID(), actorId: rootId },
    () =>
      organization.assign(
        {
          kind: 'HEAD',
          employeeId: otherEmployeeId,
          departmentId,
          reason: 'Jefe laboral explícito',
        },
        rootId,
      ),
  );
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/requests',
      headers: admin.headers,
      payload: {
        kind: 'PERMISSION',
        permissionTypeId: type.json().id,
        fromDate: '2030-01-15',
        toDate: '2030-01-15',
        reason: 'Decisión laboral separada',
        idempotencyKey: randomUUID(),
      },
    });
    expect(created.statusCode).toBe(200);
    const path = `/api/requests/${created.json().id}/decision`,
      payload = {
        decision: 'APPROVE',
        reason: 'Resolver',
        idempotencyKey: randomUUID(),
      };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers: root.headers,
          payload,
        })
      ).statusCode,
    ).toBe(403);
    const head = await login(app, 'Other@example.test');
    const approved = await app.inject({
      method: 'POST',
      url: path,
      headers: head.headers,
      payload: { ...payload, idempotencyKey: randomUUID() },
    });
    expect(approved.statusCode).toBe(200);
    expect(approved.json().status).toBe('APPROVED');
  } finally {
    await withAuditContext({ requestId: randomUUID(), actorId: rootId }, () =>
      organization.revokeAssignment(assignment.id),
    );
  }
});
it('invalidates old sessions and recovery tokens when promoting a regular account', async () => {
  const input = {
    email: `promotion-${randomUUID()}@example.test`,
    name: 'Promotion',
    password: TEST_PASSWORD,
    active: true,
    roles: ['EMPLOYEE'] as 'EMPLOYEE'[],
  };
  const target = await identity.createUser(input),
    oldSession = await login(app, input.email),
    recovery = await identity.issueRecovery(target.id);
  try {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/users/${target.id}`,
      headers: root.headers,
      payload: {
        email: input.email,
        name: input.name,
        active: true,
        roles: ['SUPER_ADMIN'],
      },
    });
    expect(response.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          url: '/api/auth/session',
          headers: { cookie: oldSession.cookie },
        })
      ).statusCode,
    ).toBe(401);
    await expect(
      identity.recover(recovery.token, 'Otra clave de prueba!'),
    ).rejects.toMatchObject({ code: 'INVALID_RECOVERY' });
    expect((await login(app, input.email)).session.user.roles).toEqual([
      'SUPER_ADMIN',
    ]);
  } finally {
    await database.db.delete(users).where(eq(users.id, target.id));
  }
});
it('revalidates the technical actor after waiting for the identity lock', async () => {
  const client = await database.pool.connect();
  let committed = false;
  const target = (await identity.listUsers()).find(
    (u) => u.id === admin.session.user.id,
  )!;
  try {
    await client.query('BEGIN');
    await client.query('select pg_advisory_xact_lock(81209001)');
    const pending = withAuditContext(
      { requestId: randomUUID(), actorId: rootId },
      () =>
        identity.updateUser(target.id, {
          email: target.email,
          name: 'Must not change',
          roles: target.roles,
          active: true,
        }),
    ).then(
      () => null,
      (error) => error,
    );
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      const result = await database.pool.query(
        "select count(*)::int n from pg_locks where locktype='advisory' and objid=81209001 and not granted and database=(select oid from pg_database where datname=current_database())",
      );
      if (result.rows[0].n) {
        waiting = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(waiting).toBe(true);
    await client.query(
      "update user_roles set role='EMPLOYEE' where user_id=$1 and role='SUPER_ADMIN'",
      [rootId],
    );
    await client.query('COMMIT');
    committed = true;
    expect(await pending).toMatchObject({ code: 'USER_MANAGEMENT_REQUIRED' });
    expect(
      (await identity.listUsers()).find((u) => u.id === target.id)?.name,
    ).toBe(target.name);
  } finally {
    if (!committed) await client.query('ROLLBACK');
    await database.pool.query(
      "update user_roles set role='SUPER_ADMIN' where user_id=$1 and role='EMPLOYEE'",
      [rootId],
    );
    client.release();
  }
});
it('protects a superadmin substitute when closing an ordinary head assignment', async () => {
  const organization = createEmployeeService(database.db);
  const head = await withAuditContext(
    { requestId: randomUUID(), actorId: rootId },
    () =>
      organization.assign(
        {
          kind: 'HEAD',
          employeeId: otherEmployeeId,
          departmentId,
          reason: 'Titular',
        },
        rootId,
      ),
  );
  const substitute = await withAuditContext(
    { requestId: randomUUID(), actorId: rootId },
    () =>
      organization.assign(
        {
          kind: 'SUBSTITUTE',
          employeeId: ownerEmployeeId,
          departmentId,
          reason: 'Suplencia protegida',
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 3600000).toISOString(),
        },
        rootId,
      ),
  );
  try {
    for (const actor of [admin, hr]) {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/assignments/${head.id}`,
        headers: actor.headers,
      });
      expect(response.statusCode).toBe(403);
    }
    const stored = await database.pool.query(
      'select revoked_at, ends_at from organization_assignments where id=$1',
      [head.id],
    );
    expect(stored.rows[0]).toMatchObject({ revoked_at: null, ends_at: null });
    const pending = await database.pool.query(
      'select revoked_at from organization_assignments where id=$1',
      [substitute.id],
    );
    expect(pending.rows[0].revoked_at).toBeNull();
  } finally {
    await withAuditContext({ requestId: randomUUID(), actorId: rootId }, () =>
      organization.revokeAssignment(head.id),
    );
  }
});
it('rejects an employee write when its administrator loses authority while waiting', async () => {
  const organization = createEmployeeService(database.db);
  const [target] = await database.db
    .select()
    .from(employees)
    .where(eq(employees.id, otherEmployeeId));
  const input = {
    employeeNumber: target!.employeeNumber,
    fullName: target!.fullName,
    departmentId: target!.departmentId,
    position: target!.position,
    joinedOn: target!.joinedOn,
    category: target!.category,
    status: target!.status,
    supervisorId: target!.supervisorId,
    userId: target!.userId,
  };
  const client = await database.pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query('select pg_advisory_xact_lock(81209001)');
    const pending = withAuditContext(
      { requestId: randomUUID(), actorId: admin.session.user.id },
      () =>
        organization.update(otherEmployeeId, {
          ...input,
          fullName: 'Must not change',
        }),
    ).then(
      () => null,
      (error) => error,
    );
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      const result = await database.pool.query(
        "select count(*)::int n from pg_locks where locktype='advisory' and objid=81209001 and not granted and database=(select oid from pg_database where datname=current_database())",
      );
      if (result.rows[0].n) {
        waiting = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(waiting).toBe(true);
    await client.query('update users set active=false where id=$1', [
      admin.session.user.id,
    ]);
    await client.query('COMMIT');
    committed = true;
    expect(await pending).toMatchObject({ code: 'USER_MANAGEMENT_REQUIRED' });
    const [stored] = await database.db
      .select()
      .from(employees)
      .where(eq(employees.id, otherEmployeeId));
    expect(stored!.fullName).toBe(target!.fullName);
  } finally {
    if (!committed) await client.query('ROLLBACK');
    await database.pool.query('update users set active=true where id=$1', [
      admin.session.user.id,
    ]);
    client.release();
  }
});
