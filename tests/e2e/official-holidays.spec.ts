import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { createPlanningService } from '../../apps/api/src/modules/planning/index.js';
import { withAuditContext } from '../../apps/api/src/modules/audit/index.js';
import { createIdentityService } from '../../apps/api/src/modules/identity/index.js';
import { test, expect, deleteTestUsers } from './fixtures.js';
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Require _test');
test('muestra el calendario oficial 2026–2027 sin duplicar ni añadir festivos empresariales', async ({
  page,
}) => {
  const database = createDatabase(source);
  const client = await database.pool.connect();
  const created: string[] = [];
  let maintenanceId: string | undefined;
  const requestId = randomUUID();
  try {
    await client.query("set statement_timeout='60s'");
    await client.query('select pg_advisory_lock(812182627)');
    const maintenance = await createIdentityService(database.db).createUser({
      email: `${randomUUID()}@example.test`,
      name: 'Mantenimiento oficial E2E',
      password: `Temporal ${randomUUID()}!`,
      roles: ['EMPLOYEE'],
      active: true,
    });
    maintenanceId = maintenance.id;
    // Explicit SUPER_ADMIN fixture in the isolated _test database; viewer stays ADMIN.
    await database.pool.query(
      "insert into user_roles(user_id,role) values($1,'SUPER_ADMIN')",
      [maintenanceId],
    );
    await withAuditContext({ requestId, actorId: maintenanceId }, () =>
      createPlanningService(database.db).syncOfficialHolidays(),
    );
    created.push(
      ...(
        await database.pool.query(
          "select entity_id from audit_events where request_id=$1 and action='planning.official_holiday.created'",
          [requestId],
        )
      ).rows.map((r) => r.entity_id),
    );
    await page.goto('/turnos');
    await expect(
      page.getByText('2026-12-25 · Navidad · LFT art. 74', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        '2027-06-06 · Jornada electoral federal ordinaria · INE / LFT art. 74',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        '2027-11-15 · Conmemoración de la Revolución · LFT art. 74',
        { exact: true },
      ),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText(
        '2027-06-06 · Jornada electoral federal ordinaria · INE / LFT art. 74',
        { exact: true },
      ),
    ).toHaveCount(1);
    const again = await withAuditContext(
      { requestId: randomUUID(), actorId: maintenanceId },
      () => createPlanningService(database.db).syncOfficialHolidays(),
    );
    expect(again).toEqual({ created: 0, unchanged: 15 });
  } finally {
    await database.pool.query('delete from holidays where id=any($1::uuid[])', [
      created,
    ]);
    if (maintenanceId) await deleteTestUsers(database, [maintenanceId]);
    await client.query('select pg_advisory_unlock(812182627)');
    client.release();
    await database.pool.end();
  }
});
