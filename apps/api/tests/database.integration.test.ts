import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnvFile } from 'node:process';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';

loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) {
  throw new Error(
    'TEST_DATABASE_URL debe apuntar explícitamente a una base terminada en _test.',
  );
}
const database = createDatabase(url);
const server = buildApp(
  parseConfig({ DATABASE_URL: url, LOG_LEVEL: 'silent', NODE_ENV: 'test' }),
);
beforeAll(async () => {
  await runMigrations(database.db);
});
afterAll(async () => {
  await server.close();
  await database.pool.end();
});

describe('PostgreSQL real', () => {
  it('aplica migraciones repetidamente sin duplicar entradas', async () => {
    const before = await database.db.execute(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    await runMigrations(database.db);
    const rows = await database.db.execute(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    expect(rows.rows).toEqual(before.rows);
    expect(rows.rows.length).toBe(1);
    const schema = await database.db.execute(
      sql`select schema_name from information_schema.schemata where schema_name = 'app_meta'`,
    );
    expect(schema.rows).toEqual([{ schema_name: 'app_meta' }]);
  });
  it('conecta mediante Drizzle y respeta rollback de transacciones', async () => {
    await expect(
      database.db.transaction(async (tx) => {
        await tx.execute(
          sql`create temporary table base_probe (value text not null) on commit drop`,
        );
        await tx.execute(
          sql`insert into base_probe (value) values ('verificado')`,
        );
        const result = await tx.execute(sql`select value from base_probe`);
        expect(result.rows).toEqual([{ value: 'verificado' }]);
        throw new Error('rollback de prueba');
      }),
    ).rejects.toThrow('rollback de prueba');
    const result = await database.db.execute(
      sql`select to_regclass('pg_temp.base_probe') as name`,
    );
    expect(result.rows).toEqual([{ name: null }]);
  });
  it('readiness confirma la conexión real', async () => {
    const response = await server.inject('/api/health/ready');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'ok' });
  });
});
