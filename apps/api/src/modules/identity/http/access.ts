import { setAuditActor } from '../../audit/index.js';
import type {} from '@fastify/cookie';
import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { SessionView } from '@asistencia/contracts';
import { HttpError } from '../../../infrastructure/http/errors.js';
import { csrfFor, type IdentityService } from '../application/service.js';
export const SESSION_COOKIE = 'asistencia_session';
export interface Scope {
  employeeId: string | null;
  departmentIds: string[];
  managedDepartmentIds: string[];
  isDirector: boolean;
}
export function trustedOrigins(
  origin: string,
  development = false,
): ReadonlySet<string> {
  const origins = new Set([origin]);
  const url = new URL(origin);
  if (
    development &&
    (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
  ) {
    url.hostname = url.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1';
    origins.add(url.origin);
  }
  return origins;
}
export function createAccessControl(
  identity: IdentityService,
  resolveScope: (id: string) => Promise<Scope>,
  origin: string,
  development = false,
) {
  const origins = trustedOrigins(origin, development);
  const cache = new WeakMap<FastifyRequest, Promise<SessionView>>();
  function checkOrigin(request: FastifyRequest) {
    if (request.headers.origin && !origins.has(request.headers.origin))
      throw new HttpError(
        403,
        'CSRF_INVALID',
        'Origen de solicitud no permitido.',
      );
    if (request.headers['sec-fetch-site'] === 'cross-site')
      throw new HttpError(
        403,
        'CSRF_INVALID',
        'Origen de solicitud no permitido.',
      );
  }
  async function actor(request: FastifyRequest): Promise<SessionView> {
    let result = cache.get(request);
    if (!result) {
      result = (async () => {
        const token = request.cookies[SESSION_COOKIE];
        const session = token ? await identity.session(token) : null;
        if (!session)
          throw new HttpError(
            401,
            'UNAUTHENTICATED',
            'Inicia sesión para continuar.',
          );
        setAuditActor(session.user.id);
        const scope = await resolveScope(session.user.id);
        const admin = session.user.roles.some(
          (role) => role === 'ADMIN' || role === 'SUPER_ADMIN',
        );
        const management = admin || session.user.roles.includes('HR');
        return {
          user: session.user,
          csrfToken: csrfFor(session.token),
          expiresAt: session.expiresAt.toISOString(),
          employeeId: scope.employeeId,
          departmentIds: scope.departmentIds,
          managedDepartmentIds: scope.managedDepartmentIds,
          permissions: {
            manageUsers: admin,
            manageOrganization: management,
            viewAllEmployees: management || scope.isDirector,
          },
        };
      })();
      cache.set(request, result);
    }
    return result;
  }
  async function mutation(request: FastifyRequest) {
    const session = await actor(request);
    checkOrigin(request);
    const supplied = request.headers['x-csrf-token'];
    if (
      typeof supplied !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(supplied) ||
      supplied.length !== session.csrfToken.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(session.csrfToken))
    )
      throw new HttpError(
        403,
        'CSRF_INVALID',
        'La sesión no pudo validar la solicitud. Actualiza la página.',
      );
    return session;
  }
  async function management(request: FastifyRequest, write = false) {
    const session = write ? await mutation(request) : await actor(request);
    if (!session.permissions.manageOrganization)
      throw new HttpError(
        403,
        'FORBIDDEN',
        'No tienes permiso para esta operación.',
      );
    return session;
  }
  async function admin(request: FastifyRequest, write = false) {
    const session = write ? await mutation(request) : await actor(request);
    if (!session.permissions.manageUsers)
      throw new HttpError(
        403,
        'FORBIDDEN',
        'No tienes permiso para administrar usuarios.',
      );
    return session;
  }
  return { actor, mutation, management, admin, checkOrigin };
}
export type AccessControl = ReturnType<typeof createAccessControl>;
