import { afterEach, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { inspectBackup } from '../src/infrastructure/operations/backup.js';
const directories: string[] = [];
afterEach(async () => {
  for (const path of directories.splice(0))
    await rm(path, { recursive: true, force: true });
});
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'asistencia-backup-'));
  directories.push(dir);
  const file = join(dir, 'snapshot.dump');
  const bytes = Buffer.from('PGDMPtest archive');
  await writeFile(file, bytes, { mode: 0o600 });
  const manifest = {
    version: 1,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    tables: { users: 2, user_roles: 3 },
    createdAt: new Date().toISOString(),
  };
  await writeFile(`${file}.json`, JSON.stringify(manifest), { mode: 0o600 });
  return { file, manifest };
}
it('validates a private custom archive without exposing its contents', async () => {
  const { file, manifest } = await fixture();
  expect(await inspectBackup(file)).toEqual(manifest);
});
it('rejects a modified archive before restore', async () => {
  const { file } = await fixture();
  await writeFile(file, 'PGDMPcorrupted');
  await expect(inspectBackup(file)).rejects.toThrow('Respaldo inválido');
});
it('rejects unsafe or malformed manifests and public permissions', async () => {
  const { file, manifest } = await fixture();
  await writeFile(
    `${file}.json`,
    JSON.stringify({
      ...manifest,
      tables: { 'users;drop database asistencia': 1 },
    }),
  );
  await expect(inspectBackup(file)).rejects.toThrow('Respaldo inválido');
  await writeFile(`${file}.json`, JSON.stringify(manifest), { mode: 0o600 });
  const { chmod } = await import('node:fs/promises');
  await chmod(file, 0o644);
  await expect(inspectBackup(file)).rejects.toThrow('Respaldo inválido');
});
