import { createInterface } from 'node:readline/promises';
import { parseConfig } from './config.js';
import { createDatabase } from '../infrastructure/database/client.js';
import {
  createIdentityService,
  IdentityError,
} from '../modules/identity/index.js';

const database = createDatabase(parseConfig(process.env).databaseUrl);
try {
  let email = process.env.ADMIN_RECOVERY_EMAIL;
  if (!email) {
    if (!process.stdin.isTTY)
      throw new IdentityError(
        'INVALID_USER',
        'Usa una terminal interactiva o configura ADMIN_RECOVERY_EMAIL.',
      );
    const reader = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      email = await reader.question('Correo del administrador: ');
    } finally {
      reader.close();
    }
  }
  const identity = createIdentityService(database.db);
  const account = (await identity.listUsers()).find(
    (user) =>
      user.email === email?.trim().toLowerCase() &&
      user.active &&
      user.roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN'),
  );
  if (!account)
    throw new IdentityError(
      'USER_NOT_FOUND',
      'No existe un administrador activo con ese correo.',
    );
  const recovery = await identity.issueRecovery(account.id, account.id);
  console.info(
    'Código temporal de un solo uso. Introdúcelo en /recuperar; no lo compartas en logs ni chats.',
  );
  console.info(recovery.token);
  console.info(`Vence: ${recovery.expiresAt}`);
} catch (error) {
  console.error(
    error instanceof IdentityError
      ? error.message
      : 'No se pudo preparar la recuperación. Revisa la conexión y las migraciones.',
  );
  process.exitCode = 1;
} finally {
  await database.pool.end();
}
