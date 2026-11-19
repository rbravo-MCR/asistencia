import { parseConfig } from '../../bootstrap/config.js';
import { createDatabase } from './client.js';
import { runMigrations } from './migrate.js';

const config = parseConfig(process.env);
const database = createDatabase(config.databaseUrl);
try {
  await runMigrations(database.db);
  console.info('Migraciones aplicadas.');
} catch {
  console.error(
    'No se pudieron aplicar las migraciones. Revisa la conexión y los archivos SQL.',
  );
  process.exitCode = 1;
} finally {
  await database.pool.end();
}
