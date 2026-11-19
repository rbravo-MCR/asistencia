import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export function createDatabase(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 10000,
    statement_timeout: 3000,
    application_name: 'asistencia-api',
  });
  // Los errores de conexiones ociosas no deben terminar el proceso ni filtrar credenciales.
  pool.on('error', () => {
    console.error('PostgreSQL: conexión ociosa interrumpida.');
  });
  return { pool, db: drizzle(pool, { schema }) };
}
export type Database = ReturnType<typeof createDatabase>['db'];
