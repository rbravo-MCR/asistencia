import type { FastifyInstance } from 'fastify';
import type { SessionView } from '@asistencia/contracts';

export const APP_ORIGIN = 'http://127.0.0.1:5173';
export const TEST_PASSWORD = 'Clave temporal de pruebas 2026!';

export async function login(
  app: FastifyInstance,
  email: string,
  password = TEST_PASSWORD,
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: APP_ORIGIN },
    payload: { email, password },
  });
  if (response.statusCode !== 200)
    throw new Error(
      `Login de fixture falló: ${response.statusCode} ${response.body}`,
    );
  const setCookie = response.headers['set-cookie'];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(
    ';',
  )[0];
  if (!cookie) throw new Error('Login no emitió cookie de sesión.');
  const session = response.json<SessionView>();
  return {
    cookie,
    session,
    headers: {
      cookie,
      origin: APP_ORIGIN,
      'x-csrf-token': session.csrfToken,
    },
  };
}
