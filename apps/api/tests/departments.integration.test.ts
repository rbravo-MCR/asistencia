import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray, sql } from 'drizzle-orm';
import { Check } from 'typebox/value';
import {
  CreateDepartmentSchema,
  DepartmentSchema,
} from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import {
  createDepartmentRepository,
  DepartmentNameAlreadyExistsError,
  InvalidDepartmentNameError,
} from '../src/modules/departments/index.js';
import { departments } from '../src/modules/departments/infrastructure/schema.js';

loadEnvFile('.env');
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL debe terminar en _test.');
const database = createDatabase(url);
const repository = createDepartmentRepository(database.db);
const ids: string[] = [];
beforeAll(async () => {
  await runMigrations(database.db);
});
afterAll(async () => {
  try {
    if (ids.length)
      await database.db.delete(departments).where(inArray(departments.id, ids));
  } finally {
    await database.pool.end();
  }
});
function name() {
  return `Departamento prueba ${randomUUID()}`;
}
async function create(value: string) {
  const result = await repository.create({ name: value });
  ids.push(result.id);
  return result;
}

describe('persistencia real de Departamentos', () => {
  it('migra desde una base vacía y conserva datos al repetir', async () => {
    const databaseName = `asistencia_migration_${randomUUID().replaceAll('-', '')}_test`;
    await database.pool.query(`CREATE DATABASE "${databaseName}"`);
    const freshUrl = new URL(url as string);
    freshUrl.pathname = `/${databaseName}`;
    const fresh = createDatabase(freshUrl.toString());
    try {
      await runMigrations(fresh.db);
      const freshRepository = createDepartmentRepository(fresh.db);
      const created = await freshRepository.create({
        name: 'Migración limpia',
      });
      await runMigrations(fresh.db);
      expect(await freshRepository.list()).toEqual([created]);
    } finally {
      await fresh.pool.end();
      await database.pool.query(`DROP DATABASE "${databaseName}"`);
    }
  });
  it('crea y consulta un departamento persistido con UUID y fecha UTC', async () => {
    const expected = name();
    const created = await create(`  ${expected}  `);
    expect(created.name).toBe(expected);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(
      Check(DepartmentSchema, {
        ...created,
        createdAt: created.createdAt.toISOString(),
      }),
    ).toBe(true);
    const listed = await repository.list();
    expect(listed).toContainEqual(created);
    const stored = await database.db
      .select()
      .from(departments)
      .where(inArray(departments.id, [created.id]));
    expect(stored).toEqual([created]);
  });
  it('detecta duplicados por mayúsculas y espacios', async () => {
    const value = `Área de atención ${randomUUID()}`;
    await create(value);
    await expect(create(` ${value.toUpperCase()} `)).rejects.toBeInstanceOf(
      DepartmentNameAlreadyExistsError,
    );
  });
  it('normaliza Unicode antes de guardar y compara nombres canónicos', async () => {
    const value = `Información ${randomUUID()}`;
    const created = await create(value.normalize('NFD'));
    expect(created.name).toBe(value);
    await expect(create(value)).rejects.toBeInstanceOf(
      DepartmentNameAlreadyExistsError,
    );
  });
  it('acepta 100 caracteres después de normalizar sin discrepancias con el contrato', async () => {
    const canonical = 'Á'.repeat(64) + randomUUID();
    const raw = ` ${canonical.normalize('NFD')} `;
    expect(Check(CreateDepartmentSchema, { name: raw })).toBe(true);
    const created = await create(raw);
    expect(created.name).toBe(canonical);
    expect(
      Check(DepartmentSchema, {
        ...created,
        createdAt: created.createdAt.toISOString(),
      }),
    ).toBe(true);
  });
  it('solo una creación concurrente con el mismo nombre puede confirmarse', async () => {
    const value = name();
    const results = await Promise.allSettled([
      create(value),
      create(value.toUpperCase()),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(
      DepartmentNameAlreadyExistsError,
    );
  });
  it('rechaza nombres inválidos antes de persistir', async () => {
    await expect(create(' \t ')).rejects.toBeInstanceOf(
      InvalidDepartmentNameError,
    );
    await expect(create('a'.repeat(101))).rejects.toBeInstanceOf(
      InvalidDepartmentNameError,
    );
    await expect(create('RR\u0000HH')).rejects.toBeInstanceOf(
      InvalidDepartmentNameError,
    );
  });
  it.each([
    '',
    ' ',
    'a'.repeat(101),
    ' nombre',
    'nombre ',
    '\u00a0nombre',
    'nombre\ufeff',
    'Informacio\u0301n',
  ])(
    'PostgreSQL rechaza nombres no canónicos o inválidos: %j',
    async (value) => {
      const attempt = database.db
        .insert(departments)
        .values({ name: value })
        .returning()
        .then((rows) => {
          ids.push(...rows.map((row) => row.id));
          return rows;
        });
      await expect(attempt).rejects.toMatchObject({ cause: { code: '23514' } });
    },
  );
  it('PostgreSQL impide duplicados aunque se omita el repositorio', async () => {
    const value = name();
    await create(value);
    await expect(
      database.db.insert(departments).values({ name: value.toUpperCase() }),
    ).rejects.toMatchObject({
      cause: {
        code: '23505',
        constraint: 'departments_name_normalized_unique',
      },
    });
  });
  it('repetir migraciones conserva departamentos existentes', async () => {
    const created = await create(name());
    const before = await database.db.execute(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    await runMigrations(database.db);
    const after = await database.db.execute(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    expect(after.rows).toEqual(before.rows);
    expect(await repository.list()).toContainEqual(created);
  });
});
