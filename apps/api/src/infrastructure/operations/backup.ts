import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { dropRestoreDatabase } from './restore.js';
import { createDatabase } from '../database/client.js';

const manifestSchema = z
  .object({
    version: z.literal(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().min(5),
    createdAt: z.iso.datetime(),
    tables: z.record(
      z.string().regex(/^[a-z_][a-z0-9_]*$/),
      z.number().int().nonnegative(),
    ),
  })
  .strict();
type Manifest = z.infer<typeof manifestSchema>;
const invalid = () =>
  new Error(
    'Respaldo inválido: revisa integridad, manifiesto y permisos privados.',
  );
async function digest(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function inspectBackup(file: string): Promise<Manifest> {
  try {
    for (const path of [file, `${file}.json`]) {
      const stat = await lstat(path);
      if (
        !stat.isFile() ||
        (stat.mode & 0o077) !== 0 ||
        stat.uid !== process.getuid?.()
      )
        throw invalid();
      if (path.endsWith('.json') && stat.size > 1048576) throw invalid();
    }
    const manifest = manifestSchema.parse(
      JSON.parse(await readFile(`${file}.json`, 'utf8')),
    );
    if (
      (await lstat(file)).size !== manifest.bytes ||
      (await digest(file)) !== manifest.sha256
    )
      throw invalid();
    return manifest;
  } catch {
    throw invalid();
  }
}
function command(
  root: string,
  service: 'postgres' | 'postgres-test',
  args: string[],
) {
  const child = spawn(
    'docker',
    [
      'compose',
      '--env-file',
      '.env',
      '-f',
      'infra/compose.yaml',
      'exec',
      '-T',
      service,
      ...args,
    ],
    {
      cwd: root,
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 120000,
    },
  );
  const done = new Promise<void>((accept, reject) => {
    child.once('error', () =>
      reject(
        new Error('No se pudo ejecutar el cliente PostgreSQL del contenedor.'),
      ),
    );
    child.once('close', (code) =>
      code === 0
        ? accept()
        : reject(
            new Error(
              'Falló la operación PostgreSQL; no se imprimieron credenciales.',
            ),
          ),
    );
  });
  return { child, done };
}
async function completeCommand(
  process: ReturnType<typeof command>,
  transfer: Promise<void>,
) {
  try {
    await Promise.all([transfer, process.done]);
  } catch (error) {
    process.child.kill('SIGTERM');
    await Promise.allSettled([transfer, process.done]);
    throw error;
  }
}
function localUrl(value: string | undefined, test: boolean) {
  if (!value) throw new Error('Falta la conexión de respaldo o pruebas.');
  const url = new URL(value);
  const port = test
    ? (process.env.POSTGRES_TEST_PORT ?? '55433')
    : (process.env.POSTGRES_PORT ?? '55432');
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== port ||
    (test
      ? !url.pathname.endsWith('_test')
      : decodeURIComponent(url.pathname.slice(1)) !== process.env.POSTGRES_DB)
  )
    throw new Error(
      'El respaldo local requiere las bases de Compose; no admite destinos externos.',
    );
  return value;
}
const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`;
async function tableCounts(client: {
  query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
}) {
  const tables = await client.query(
    "select tablename from pg_tables where schemaname='public' order by tablename",
  );
  const result: Record<string, number> = {};
  for (const row of tables.rows) {
    const name = String(row.tablename);
    const count = await client.query(
      `select count(*)::int n from public.${quoted(name)}`,
    );
    result[name] = Number(count.rows[0]!.n);
  }
  return result;
}
export async function createBackup(root: string, directory: string) {
  const database = createDatabase(localUrl(process.env.DATABASE_URL, false));
  const dir = resolve(directory);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const file = join(
    dir,
    `asistencia-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.dump`,
  );
  let client;
  try {
    client = await database.pool.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const snapshot = String(
      (await client.query('select pg_export_snapshot() snapshot')).rows[0]
        .snapshot,
    );
    if (!/^[A-Fa-f0-9]+-[A-Fa-f0-9]+-\d+$/.test(snapshot))
      throw new Error('Snapshot PostgreSQL inválido.');
    const tables = await tableCounts(client);
    const process = command(root, 'postgres', [
      'sh',
      '-c',
      'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges --snapshot="$1"',
      'backup',
      snapshot,
    ]);
    process.child.stdin.end();
    await completeCommand(
      process,
      pipeline(
        process.child.stdout,
        createWriteStream(file, { flags: 'wx', mode: 0o600 }),
      ),
    );
    await client.query('COMMIT');
    const manifest: Manifest = {
      version: 1,
      sha256: await digest(file),
      bytes: (await lstat(file)).size,
      createdAt: new Date().toISOString(),
      tables,
    };
    await writeFile(`${file}.json`, `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
    await inspectBackup(file);
    return { file, bytes: manifest.bytes, tables: Object.keys(tables).length };
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    await rm(file, { force: true });
    await rm(`${file}.json`, { force: true });
    throw error;
  } finally {
    client?.release();
    await database.pool.end();
  }
}
export async function verifyBackup(root: string, file: string) {
  const manifest = await inspectBackup(file);
  const source = localUrl(process.env.TEST_DATABASE_URL, true);
  const control = createDatabase(source);
  const name = `restore_${randomUUID().replaceAll('-', '')}_test`;
  let made = false;
  let restored: ReturnType<typeof createDatabase> | undefined;
  try {
    await control.pool.query(`create database ${quoted(name)}`);
    made = true;
    const process = command(root, 'postgres-test', [
      'sh',
      '-c',
      'exec pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error --no-owner --no-privileges',
      'restore',
      name,
    ]);
    process.child.stdout.resume();
    await completeCommand(
      process,
      pipeline(createReadStream(file), process.child.stdin),
    );
    const target = new URL(source);
    target.pathname = `/${name}`;
    restored = createDatabase(target.toString());
    const counts = await tableCounts(restored.pool);
    if (JSON.stringify(counts) !== JSON.stringify(manifest.tables))
      throw new Error(
        'Los recuentos restaurados no coinciden con el snapshot del respaldo.',
      );
    for (const table of [
      'users',
      'user_roles',
      'employees',
      'audit_events',
      'leave_requests',
      'vacation_movements',
      'attendance_attempts',
    ])
      if (!(table in counts))
        throw new Error('El respaldo no contiene la estructura de Asistencia.');
    const integrity = await restored.pool.query(
      "select count(*)::int n from pg_constraint where connamespace='public'::regnamespace and not convalidated",
    );
    if (integrity.rows[0].n)
      throw new Error('La restauración contiene restricciones sin validar.');
    return {
      verified: true,
      tables: Object.keys(counts).length,
      rows: Object.values(counts).reduce((a, b) => a + b, 0),
      sha256: manifest.sha256,
    };
  } finally {
    await restored?.pool.end();
    try {
      if (made) await dropRestoreDatabase(control.pool, name);
    } finally {
      await control.pool.end();
    }
  }
}
