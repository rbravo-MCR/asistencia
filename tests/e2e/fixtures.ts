import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { createIdentityService } from '../../apps/api/src/modules/identity/index.js';

export type TestAccount = { id: string; email: string; password: string };
export async function deleteTestUsers(
  database: ReturnType<typeof createDatabase>,
  ids: string[],
) {
  if (!ids.length) return;
  const client = await database.pool.connect();
  try {
    await client.query('begin');
    // Notifications resolve recipients and insert outbox rows under this same lock.
    // A parallel fixture must not delete a recipient between those two operations.
    await client.query('select pg_advisory_xact_lock(81209002)');
    await client.query('delete from users where id=any($1::uuid[])', [ids]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('E2E requiere TEST_DATABASE_URL terminada en _test.');

export const test = base.extend<{ account: TestAccount }>({
  account: async ({ browserName }, use) => {
    const database = createDatabase(databaseUrl as string);
    let id: string | undefined;
    try {
      const input = {
        email: `${randomUUID()}@example.test`,
        name: `Administración E2E ${browserName}`,
        password: `Temporal E2E ${randomUUID()}!`,
        roles: ['ADMIN'] as const,
        active: true,
      };
      const user = await createIdentityService(database.db, {
        sessionHours: 8,
      }).createUser({ ...input, roles: [...input.roles] });
      id = user.id;
      await use({ id, email: input.email, password: input.password });
    } finally {
      try {
        if (id) await deleteTestUsers(database, [id]);
      } finally {
        await database.pool.end();
      }
    }
  },
  page: async ({ page, account }, use) => {
    const response = await page.request.post('/api/auth/login', {
      headers: { origin: 'http://127.0.0.1:5183' },
      data: { email: account.email, password: account.password },
    });
    expect(response.status()).toBe(200);
    await use(page);
  },
});
export { expect };

export async function openMainNavigation(page: Page) {
  const navigation = page.getByRole('navigation', {
    name: 'Principal',
    exact: true,
  });
  if (!(await navigation.isVisible()))
    await page.getByRole('button', { name: 'Abrir menú principal' }).click();
  await expect(navigation).toBeVisible();
  return navigation;
}
