import { loadEnvFile } from 'node:process';
import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import pg from 'pg';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { dropRestoreDatabase } from '../src/infrastructure/operations/restore.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Solo _test');
it('elimina solo su base temporal incluso si una restauración cancelada sigue conectada', async () => {
  const control = createDatabase(source);
  const name = `restore_${randomUUID().replaceAll('-', '')}_test`;
  const url = new URL(source);
  url.pathname = `/${name}`;
  let active: pg.Client | undefined;
  try {
    await expect(
      dropRestoreDatabase(control.pool, 'asistencia'),
    ).rejects.toThrow('Base temporal inválida');
    await expect(
      dropRestoreDatabase(control.pool, 'asistencia_test'),
    ).rejects.toThrow('Base temporal inválida');
    await control.pool.query(`create database "${name}"`);
    active = new pg.Client({ connectionString: url.toString() });
    active.on('error', () => {});
    await active.connect();
    const running = active.query('select pg_sleep(20)').catch((error) => error);
    await dropRestoreDatabase(control.pool, name);
    const result = await control.pool.query(
      'select datname from pg_database where datname=$1',
      [name],
    );
    expect(result.rows).toEqual([]);
    expect(await running).toBeInstanceOf(Error);
  } finally {
    await active?.end().catch(() => {});
    try {
      await control.pool.query(
        `drop database if exists "${name}" with (force)`,
      );
    } finally {
      await control.pool.end();
    }
  }
});
