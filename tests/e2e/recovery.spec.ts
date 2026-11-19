import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../apps/api/src/infrastructure/database/client.js';
import { test, expect } from './fixtures.js';

test('recupera acceso real, conserva el error y permite pegar la contraseña', async ({
  page,
  context,
  account,
}) => {
  const origin = 'http://127.0.0.1:5183';
  const session = await (await page.request.get('/api/auth/session')).json();
  const headers = { origin, 'x-csrf-token': session.csrfToken };
  const issued = await page.request.post(`/api/users/${account.id}/recovery`, {
    headers,
  });
  expect(issued.status()).toBe(200);
  const { token } = await issued.json();
  expect(
    (await page.request.post('/api/auth/logout', { headers })).status(),
  ).toBe(204);
  await page.goto('/recuperar');
  const code = page.getByLabel('Código de recuperación', { exact: true });
  const password = ` Recuperada ${randomUUID()} `;
  await code.fill('codigo-invalido');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'No se pudo recuperar el acceso',
  );
  await expect(code).toHaveValue('codigo-invalido');
  await expect(
    page.getByLabel('Nueva contraseña', { exact: true }),
  ).toHaveValue(password);
  await code.fill(token);
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Contraseña actualizada',
  );
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('status')).toContainText(
    'Contraseña actualizada',
  );
  await page.getByRole('link', { name: 'Ingresar', exact: true }).click();
  await page.getByLabel('Número de usuario o correo').fill(account.email);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin,
  });
  await page.evaluate(
    (value) => navigator.clipboard.writeText(value),
    password,
  );
  const loginPassword = page.getByLabel('Contraseña', { exact: true });
  await loginPassword.focus();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(loginPassword).toHaveValue(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible();
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
    throw new Error('Solo PostgreSQL _test.');
  const database = createDatabase(databaseUrl);
  try {
    const consumed = await database.pool.query(
      'select used_at from recovery_tokens where user_id=$1',
      [account.id],
    );
    expect(consumed.rows).toHaveLength(1);
    expect(consumed.rows[0].used_at).toBeInstanceOf(Date);
  } finally {
    await database.pool.end();
  }
});
