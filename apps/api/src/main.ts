import { buildApp } from './bootstrap/app.js';
import { parseConfig } from './bootstrap/config.js';

const config = parseConfig(process.env);
const app = buildApp(config);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  try {
    await app.close();
  } catch {
    process.exitCode = 1;
  }
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
try {
  await app.listen({ host: config.host, port: config.port });
} catch {
  app.log.error(
    'No se pudo iniciar la API. Revisa el puerto y la configuración.',
  );
  await shutdown();
  process.exitCode = 1;
}
