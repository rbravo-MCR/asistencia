import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { parseConfig } from './config.js';
import { createDatabase } from '../infrastructure/database/client.js';
import {
  createIdentityService,
  IdentityError,
} from '../modules/identity/index.js';

let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
async function credentials() {
  const {
    BOOTSTRAP_ADMIN_EMAIL: email,
    BOOTSTRAP_ADMIN_NAME: name,
    BOOTSTRAP_ADMIN_PASSWORD: password,
  } = process.env;
  if (email && name && password) return { email, name, password };
  if (!process.stdin.isTTY)
    throw new IdentityError(
      'INVALID_USER',
      'Usa una terminal interactiva o configura las tres variables BOOTSTRAP_ADMIN_* de forma segura.',
    );
  const reader = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  try {
    const enteredEmail =
      email ?? (await reader.question('Correo del primer administrador: '));
    const enteredName = name ?? (await reader.question('Nombre: '));
    process.stdout.write('Contraseña (6–128 caracteres, entrada oculta): ');
    muted = true;
    const enteredPassword = await reader.question('');
    muted = false;
    process.stdout.write('\n');
    process.stdout.write('Repite la contraseña: ');
    muted = true;
    const repeated = await reader.question('');
    muted = false;
    process.stdout.write('\n');
    if (enteredPassword !== repeated)
      throw new IdentityError('INVALID_USER', 'Las contraseñas no coinciden.');
    return {
      email: enteredEmail,
      name: enteredName,
      password: enteredPassword,
    };
  } finally {
    muted = false;
    reader.close();
  }
}
const database = createDatabase(parseConfig(process.env).databaseUrl);
try {
  await createIdentityService(database.db).createInitialAdmin(
    await credentials(),
  );
  console.info('Administrador inicial creado. Ya puedes iniciar sesión.');
} catch (error) {
  console.error(
    error instanceof IdentityError
      ? error.message
      : 'No se pudo crear el administrador. Revisa la conexión y las migraciones.',
  );
  process.exitCode = 1;
} finally {
  await database.pool.end();
}
