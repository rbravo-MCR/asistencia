import { Check } from 'typebox/value';
import type { TSchema, Static } from 'typebox';
import { ErrorSchema } from '@asistencia/contracts';

export const dataChangedEvent = 'asistencia:data-changed';
export const sessionExpiredEvent = 'asistencia:session-expired';
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function request<T extends TSchema>(
  path: string,
  schema: T,
  options: {
    method?: string;
    body?: unknown;
    csrfToken?: string;
    signal?: AbortSignal;
    public?: boolean;
  } = {},
): Promise<Static<T>> {
  const response = await send(path, options);
  const data: unknown = await response.json();
  if (!Check(schema, data))
    throw new Error(
      'La respuesta del servidor no es válida. Actualiza antes de continuar.',
    );
  return data;
}
export async function requestVoid(
  path: string,
  options: Parameters<typeof send>[1],
) {
  await send(path, options);
}
async function send(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    csrfToken?: string;
    signal?: AbortSignal;
    public?: boolean;
  } = {},
) {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(options.body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
      ...(options.csrfToken ? { 'x-csrf-token': options.csrfToken } : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 401 && !options.public)
      window.dispatchEvent(new Event(sessionExpiredEvent));
    let code = 'REQUEST_FAILED';
    let message =
      'No se pudo completar la solicitud. Revisa los datos y actualiza el listado antes de reintentar.';
    try {
      const data: unknown = await response.json();
      if (Check(ErrorSchema, data)) {
        code = data.error.code;
        message = data.error.message;
      }
    } catch {
      /* Mantener mensaje seguro para errores sin JSON. */
    }
    throw new ApiError(response.status, code, message);
  }
  if (options.method && options.method !== 'GET')
    window.dispatchEvent(new Event(dataChangedEvent));
  return response;
}
