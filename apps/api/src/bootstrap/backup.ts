import { resolve } from 'node:path';
import {
  createBackup,
  verifyBackup,
} from '../infrastructure/operations/backup.js';
const root = resolve('../..');
try {
  const [operation, path] = process.argv.slice(2);
  if (!path || !['create', 'verify'].includes(operation ?? ''))
    throw new Error(
      'Uso: backup create DIRECTORIO_PRIVADO | backup verify ARCHIVO.dump',
    );
  console.log(
    JSON.stringify(
      operation === 'create'
        ? await createBackup(root, path)
        : await verifyBackup(root, resolve(path)),
    ),
  );
} catch {
  console.error(
    'No se completó la operación. Revisa conexiones locales, contenedores PostgreSQL, archivo/manifiesto y permisos.',
  );
  process.exitCode = 1;
}
