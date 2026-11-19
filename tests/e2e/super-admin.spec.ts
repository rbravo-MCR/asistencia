import { test, expect } from './fixtures.js';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';

// Fixture credentials and sessions are real; this database is isolated from development.
test('superadministrador conserva acceso completo y muestra el rol en cuenta y usuarios', async ({
  page,
  account,
}, testInfo) => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
    throw new Error('Solo base de pruebas.');
  const database = createDatabase(databaseUrl);
  try {
    await database.pool.query(
      "update user_roles set role='SUPER_ADMIN' where user_id=$1 and role='ADMIN'",
      [account.id],
    );
    await page.goto('/cuenta');
    await expect(
      page.getByText('Super administrador', { exact: true }),
    ).toBeVisible();
    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Super administrador', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar panel' }).click();
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: account.email })
        .getByRole('button', { name: /^Editar Administración E2E/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('super-admin.png'),
      fullPage: true,
    });
    await database.pool.query(
      "update user_roles set role='ADMIN' where user_id=$1 and role='SUPER_ADMIN'",
      [account.id],
    );
    await page.reload();
    await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Super administrador', exact: true }),
    ).toHaveCount(0);
  } finally {
    await database.pool.end();
  }
});
