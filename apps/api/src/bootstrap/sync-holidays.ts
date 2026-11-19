import { randomUUID } from 'node:crypto';
import { parseConfig } from './config.js';
import { createDatabase } from '../infrastructure/database/client.js';
import { createIdentityService } from '../modules/identity/index.js';
import { createPlanningService } from '../modules/planning/index.js';
import { withAuditContext } from '../modules/audit/index.js';

// Privileged server-maintenance CLI. No credentials or personal data are printed.
const config = parseConfig(process.env);
const database = createDatabase(config.databaseUrl);
try {
  const args = process.argv.slice(2);
  if (
    args.length &&
    !(
      args.length === 2 &&
      args[0] === '--actor' &&
      /^[0-9a-f-]{36}$/i.test(args[1]!)
    )
  )
    throw Error('Uso: holidays:sync [--actor UUID_SUPER_ADMIN]');
  const candidates = (
    await createIdentityService(database.db).listUsers()
  ).filter(
    (u) =>
      u.active &&
      u.roles.includes('SUPER_ADMIN') &&
      (!args.length || u.id === args[1]),
  );
  if (candidates.length !== 1)
    throw Error('Indica un SUPER_ADMIN activo mediante --actor.');
  const result = await withAuditContext(
    { requestId: randomUUID(), actorId: candidates[0]!.id },
    () => createPlanningService(database.db).syncOfficialHolidays(),
  );
  console.log(JSON.stringify(result));
} catch (error) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'CONFIGURATION_ERROR';
  console.error(
    `No se cargó el calendario oficial (${code}). Revisa actor activo, migraciones y fechas conflictivas.`,
  );
  process.exitCode = 1;
} finally {
  await database.pool.end();
}
