import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';

loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('Solo prueba en _test.');
const admin = createDatabase(source);
const name = `asistencia_cli_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
let created = false;
beforeAll(async () => {
  await admin.pool.query(`CREATE DATABASE "${name}"`);
  created = true;
  await runMigrations(database.db);
});
afterAll(async () => {
  try {
    await database.pool.end();
    if (created) await admin.pool.query(`DROP DATABASE "${name}"`);
  } finally {
    await admin.pool.end();
  }
});
it('CLI crea un único administrador y permite recuperar acceso sin mostrar contraseña', async () => {
  const password = `Clave CLI temporal ${randomUUID()}`;
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    BOOTSTRAP_ADMIN_EMAIL: 'cli@example.test',
    BOOTSTRAP_ADMIN_NAME: 'Administrador CLI',
    BOOTSTRAP_ADMIN_PASSWORD: password,
    ADMIN_RECOVERY_EMAIL: 'cli@example.test',
  };
  const run = (file: string) =>
    spawnSync(
      process.execPath,
      [
        '--env-file=.env',
        '--import',
        'tsx',
        `apps/api/src/bootstrap/${file}.ts`,
      ],
      { cwd: process.cwd(), env, encoding: 'utf8', timeout: 15000 },
    );
  const first = run('create-admin');
  expect(first.status).toBe(0);
  expect(first.stdout + first.stderr).not.toContain(password);
  expect(first.stdout + first.stderr).not.toContain('$argon2');
  expect(run('create-admin').status).toBe(1);
  const recovery = run('recover-admin');
  expect(recovery.status).toBe(0);
  expect(recovery.stdout).toMatch(/\n[A-Za-z0-9_-]{43}\n/);
  const rows = await database.pool.query(
    'select count(*)::int as count from users',
  );
  expect(rows.rows).toEqual([{ count: 1 }]);
});
