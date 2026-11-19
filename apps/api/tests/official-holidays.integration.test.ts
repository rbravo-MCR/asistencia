import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { createPlanningService } from '../src/modules/planning/index.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { withAuditContext } from '../src/modules/audit/index.js';
import { TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Require _test');
const control = createDatabase(source),
  name = `official_${randomUUID().replaceAll('-', '')}_test`,
  url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString()),
  service = createPlanningService(database.db);
let made = false,
  actorId: string,
  outsiderId: string;
beforeAll(async () => {
  await control.pool.query(`create database "${name}"`);
  made = true;
  await runMigrations(database.db);
  const identity = createIdentityService(database.db);
  actorId = (
    await identity.createInitialAdmin({
      email: 'official@example.test',
      name: 'Calendario',
      password: TEST_PASSWORD,
    })
  ).id;
  await database.pool.query(
    "insert into user_roles(user_id,role) values($1,'SUPER_ADMIN')",
    [actorId],
  );
  outsiderId = (
    await identity.createUser({
      email: 'outside@example.test',
      name: 'Fuera',
      password: TEST_PASSWORD,
      roles: ['EMPLOYEE'],
      active: true,
    })
  ).id;
});
afterAll(async () => {
  await database.pool.end();
  try {
    if (made) await control.pool.query(`drop database "${name}"`);
  } finally {
    await control.pool.end();
  }
});
const sync = (actor = actorId) =>
  withAuditContext({ requestId: randomUUID(), actorId: actor }, () =>
    service.syncOfficialHolidays(),
  );
it('requires an active SUPER_ADMIN inside the transaction even if the CLI selected one earlier', async () => {
  await expect(service.syncOfficialHolidays()).rejects.toMatchObject({
    code: 'SUPER_ADMIN_REQUIRED',
  });
  await database.pool.query(
    "delete from user_roles where user_id=$1 and role='SUPER_ADMIN'",
    [actorId],
  );
  try {
    await expect(sync()).rejects.toMatchObject({
      code: 'SUPER_ADMIN_REQUIRED',
    });
  } finally {
    await database.pool.query(
      "insert into user_roles(user_id,role) values($1,'SUPER_ADMIN')",
      [actorId],
    );
  }
  expect(await service.listHolidays()).toEqual([]);
});
it('rolls back a conflicting official date, checks authority and imports only the official calendar once', async () => {
  await expect(sync(outsiderId)).rejects.toMatchObject({
    code: 'USER_MANAGEMENT_REQUIRED',
  });
  await service.saveHoliday({
    name: 'Otro contenido protegido',
    date: '2026-12-25',
  });
  await expect(sync()).rejects.toMatchObject({
    code: 'OFFICIAL_CALENDAR_CONFLICT',
  });
  expect(await service.listHolidays()).toHaveLength(1);
  const [existing] = await service.listHolidays();
  await service.deleteHoliday(existing!.id);
  expect(await sync()).toEqual({ created: 15, unchanged: 0 });
  const first = await service.listHolidays();
  expect(first).toHaveLength(15);
  expect(await sync()).toEqual({ created: 0, unchanged: 15 });
  expect(await service.listHolidays()).toEqual(first);
  const audits = await database.pool.query(
    "select actor_id from audit_events where action='planning.official_calendar.loaded'",
  );
  expect(audits.rows).toEqual([{ actor_id: actorId }]);
});
