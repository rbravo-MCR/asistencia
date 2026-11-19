import { sessionExpiredEvent } from '@/lib/api';
import { Check } from 'typebox/value';
import {
  DepartmentSchema,
  DepartmentListSchema,
  ErrorSchema,
  type CreateDepartmentRequest,
  type DepartmentResponse,
  type DepartmentListResponse,
} from '@asistencia/contracts';

export class DepartmentApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super('No se pudo completar la solicitud de Departamentos.');
    this.name = 'DepartmentApiError';
  }
}

async function assertSuccess(response: Response): Promise<void> {
  if (response.ok) return;
  if (response.status === 401)
    window.dispatchEvent(new Event(sessionExpiredEvent));
  let code = 'REQUEST_FAILED';
  try {
    const data: unknown = await response.json();
    if (Check(ErrorSchema, data)) code = data.error.code;
  } catch {
    /* Las respuestas no JSON también se presentan como error recuperable. */
  }
  throw new DepartmentApiError(response.status, code);
}

export async function fetchDepartments({
  signal,
}: {
  signal: AbortSignal;
}): Promise<DepartmentListResponse> {
  const response = await fetch('/api/departments', {
    signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    cache: 'no-store',
  });
  await assertSuccess(response);
  const data: unknown = await response.json();
  if (!Check(DepartmentListSchema, data))
    throw new Error('Respuesta de listado inválida.');
  return data;
}

export async function postDepartment(
  input: CreateDepartmentRequest,
  csrfToken: string,
): Promise<DepartmentResponse> {
  const response = await fetch('/api/departments', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10000),
  });
  await assertSuccess(response);
  const data: unknown = await response.json();
  if (!Check(DepartmentSchema, data))
    throw new Error('No se pudo confirmar la respuesta de creación.');
  return data;
}

export async function putDepartment(
  id: string,
  input: CreateDepartmentRequest,
  csrfToken: string,
): Promise<DepartmentResponse> {
  const response = await fetch(`/api/departments/${id}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10000),
  });
  await assertSuccess(response);
  const data: unknown = await response.json();
  if (!Check(DepartmentSchema, data))
    throw new Error('No se pudo confirmar la respuesta de actualización.');
  return data;
}
export async function deleteDepartment(
  id: string,
  csrfToken: string,
): Promise<void> {
  const response = await fetch(`/api/departments/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'x-csrf-token': csrfToken },
    signal: AbortSignal.timeout(10000),
  });
  await assertSuccess(response);
}
