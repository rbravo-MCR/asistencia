import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';

loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('Se requiere TEST_DATABASE_URL _test.');
const control = createDatabase(source);
const databaseName = `asistencia_audit_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(source);
url.pathname = `/${databaseName}`;
const database = createDatabase(url.toString());
const app = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
const identity = createIdentityService(database.db);
let admin: Awaited<ReturnType<typeof login>>;
let employee: Awaited<ReturnType<typeof login>>;
let adminId: string;
let employeeId: string;
let created = false;
beforeAll(async () => {
  await control.pool.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  await runMigrations(database.db);
  const first = await identity.createInitialAdmin({
    email: 'audit-admin@example.test',
    name: 'Administrador',
    password: TEST_PASSWORD,
  });
  adminId = first.id;
  const member = await identity.createUser({
    email: 'audit-employee@example.test',
    name: 'Empleado',
    password: TEST_PASSWORD,
    roles: ['EMPLOYEE'],
    active: true,
  });
  employeeId = member.id;
  admin = await login(app, first.email);
  employee = await login(app, member.email);
});
afterAll(async () => {
  await app.close();
  await database.pool.end();
  try {
    if (created) await control.pool.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    await control.pool.end();
  }
});

it('protege auditoría global y bandejas personales con sesión y rol', async () => {
  expect((await app.inject('/api/notifications')).statusCode).toBe(401);
  expect((await app.inject('/api/audit-events')).statusCode).toBe(401);
  expect(
    (await app.inject({ url: '/api/audit-events', headers: employee.headers }))
      .statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({ url: '/api/notifications', headers: employee.headers })
    ).json(),
  ).toEqual({ items: [], unreadCount: 0 });
});

it('registra cambios transaccionales y conserva actor/correlation ID sin secretos', async () => {
  const creation = await app.inject({
    method: 'POST',
    url: '/api/departments',
    headers: admin.headers,
    payload: { name: `Auditoría ${randomUUID()}` },
  });
  expect(creation.statusCode).toBe(201);
  const result = await app.inject({
    url: '/api/audit-events?limit=100&entityType=department',
    headers: admin.headers,
  });
  expect(result.statusCode).toBe(200);
  expect(result.json().items).toContainEqual(
    expect.objectContaining({
      entityId: creation.json().id,
      action: 'DEPARTMENT_CREATED',
      actorId: adminId,
      requestId: creation.headers['x-request-id'],
    }),
  );
  const userEvents = await app.inject({
    url: '/api/audit-events?entityType=user',
    headers: admin.headers,
  });
  expect(userEvents.body).not.toMatch(
    /audit-admin@example.test|audit-employee@example.test/,
  );
  const extra = await identity.createUser({
    email: 'audit-old@example.test',
    name: 'Persona',
    password: TEST_PASSWORD,
    roles: ['EMPLOYEE'],
    active: true,
  });
  const updated = await app.inject({
    method: 'PUT',
    url: `/api/users/${extra.id}`,
    headers: admin.headers,
    payload: {
      email: 'audit-new@example.test',
      name: 'Persona actualizada',
      roles: ['EMPLOYEE'],
      active: true,
    },
  });
  expect(updated.statusCode).toBe(200);
  const updatedEvents = await app.inject({
    url: '/api/audit-events?entityType=user',
    headers: admin.headers,
  });
  expect(updatedEvents.body).not.toMatch(
    /audit-old@example.test|audit-new@example.test/,
  );
  const before = result.json().total;
  const duplicate = await app.inject({
    method: 'POST',
    url: '/api/departments',
    headers: admin.headers,
    payload: { name: creation.json().name },
  });
  expect(duplicate.statusCode).toBe(409);
  expect(
    (
      await app.inject({
        url: '/api/audit-events?entityType=department',
        headers: admin.headers,
      })
    ).json().total,
  ).toBe(before);
  const { recordAudit } = await import('../src/modules/audit/index.js');
  await database.db.transaction((tx) =>
    recordAudit(tx, {
      action: 'SANITIZE_TEST',
      entityType: 'test',
      entityId: randomUUID(),
      before: {
        password: 'secret',
        passwordHash: 'secret',
        phoneNumber: '9991234567',
        address: 'Privado',
        nested: { token: 'secret', latitude: 21 },
        status: 'ACTIVE',
      },
      after: { status: 'INACTIVE' },
    }),
  );
  const sanitized = await app.inject({
    url: '/api/audit-events?action=SANITIZE_TEST',
    headers: admin.headers,
  });
  expect(sanitized.body).not.toMatch(
    /secret|Privado|9991234567|latitude|passwordHash/,
  );
  expect(sanitized.json().items[0].before.status).toBe('ACTIVE');
});

it('entrega outbox de forma idempotente y limita lectura/marcado al destinatario', async () => {
  const { recordAudit, enqueueNotifications, dispatchNotifications } =
    await import('../src/modules/audit/index.js');
  const eventId = await database.db.transaction(async (tx) => {
    const id = await recordAudit(tx, {
      action: 'NOTICE_TEST',
      entityType: 'test',
      entityId: randomUUID(),
      actorId: adminId,
    });
    const input = {
      eventId: id,
      recipientIds: [employeeId],
      title: 'Turno publicado',
      message: 'Consulta tu calendario.',
      href: '/calendario',
    };
    await enqueueNotifications(tx, input);
    await enqueueNotifications(tx, input);
    return id;
  });
  await Promise.all([
    dispatchNotifications(database.db),
    dispatchNotifications(database.db),
  ]);
  await dispatchNotifications(database.db);
  const inbox = await app.inject({
    url: '/api/notifications',
    headers: employee.headers,
  });
  expect(inbox.json().unreadCount).toBe(1);
  expect(inbox.json().items).toHaveLength(1);
  const id = inbox.json().items[0].id;
  expect(
    (
      await app.inject({ url: '/api/notifications', headers: admin.headers })
    ).json().items,
  ).toHaveLength(0);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: `/api/notifications/${id}/read`,
        headers: admin.headers,
      })
    ).statusCode,
  ).toBe(404);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: `/api/notifications/${id}/read`,
        headers: { cookie: employee.headers.cookie },
      })
    ).statusCode,
  ).toBe(403);
  for (let i = 0; i < 2; i++)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/notifications/${id}/read`,
          headers: employee.headers,
        })
      ).statusCode,
    ).toBe(204);
  expect(
    (
      await app.inject({ url: '/api/notifications', headers: employee.headers })
    ).json().unreadCount,
  ).toBe(0);
  expect(
    (
      await database.pool.query(
        'select count(*)::int as count from notification_outbox where event_id=$1 and delivered_at is not null',
        [eventId],
      )
    ).rows,
  ).toEqual([{ count: 1 }]);
});

it('revierte el cambio si no puede persistirse su auditoría y revierte una outbox abortada', async () => {
  await database.pool.query(
    `create function reject_audit_test() returns trigger language plpgsql as $$ begin if NEW.action = 'DEPARTMENT_CREATED' then raise exception 'fallo aislado de auditoría'; end if; return NEW; end $$`,
  );
  await database.pool.query(
    'create trigger reject_audit_test before insert on audit_events for each row execute function reject_audit_test()',
  );
  const name = `No confirmar ${randomUUID()}`;
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/api/departments',
      headers: admin.headers,
      payload: { name },
    });
    expect(result.statusCode).toBe(500);
    expect(result.body).not.toMatch(/fallo aislado|insert|trigger/i);
    expect(
      (
        await database.pool.query('select id from departments where name=$1', [
          name,
        ])
      ).rows,
    ).toEqual([]);
  } finally {
    await database.pool.query('drop trigger reject_audit_test on audit_events');
    await database.pool.query('drop function reject_audit_test()');
  }
  const { recordAudit, enqueueNotifications } =
    await import('../src/modules/audit/index.js');
  const entityId = randomUUID();
  await expect(
    database.db.transaction(async (tx) => {
      const eventId = await recordAudit(tx, {
        action: 'ABORT_TEST',
        entityType: 'test',
        entityId,
      });
      await enqueueNotifications(tx, {
        eventId,
        recipientIds: [employeeId],
        title: 'No entregar',
        message: 'Transacción abortada.',
        href: '/calendario',
      });
      throw new Error('abortado');
    }),
  ).rejects.toThrow('abortado');
  expect(
    (
      await database.pool.query(
        'select id from audit_events where entity_id=$1',
        [entityId],
      )
    ).rows,
  ).toEqual([]);
  expect(
    (
      await database.pool.query(
        "select id from notification_outbox where title='No entregar'",
      )
    ).rows,
  ).toEqual([]);
});
