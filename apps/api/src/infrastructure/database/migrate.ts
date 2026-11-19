import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client.js';

export async function runMigrations(db: Database) {
  await migrate(db, {
    migrationsFolder: fileURLToPath(
      new URL('../../../drizzle/', import.meta.url),
    ),
  });
}
