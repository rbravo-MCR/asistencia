import type {} from '@fastify/cookie';
import { Type } from 'typebox';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  LoginSchema,
  SessionSchema,
  UserInputSchema,
  UserListSchema,
  UserSchema,
  UserUpdateSchema,
  UserDirectorySchema,
  IdParamsSchema,
  ChangePasswordSchema,
  RecoverySchema,
  RecoveryTokenSchema,
  ErrorSchema,
} from '@asistencia/contracts';
import { IdentityError } from '../domain/policy.js';
import type { IdentityService } from '../application/service.js';
import { SESSION_COOKIE, type AccessControl } from './access.js';

export function registerIdentityRoutes(
  app: FastifyInstance,
  identity: IdentityService,
  access: AccessControl,
  production: boolean,
  sessionHours: number,
): void {
  app.register(async (scope) => {
    const routes = scope.withTypeProvider<TypeBoxTypeProvider>();
    routes.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });
    routes.setErrorHandler((error, request, reply) => {
      if (!(error instanceof IdentityError)) throw error;
      const status =
        error.code === 'INVALID_CREDENTIALS'
          ? 401
          : error.code === 'USER_NOT_FOUND'
            ? 404
            : [
                  'ACCOUNT_CONFLICT',
                  'LAST_ADMIN',
                  'LAST_SUPER_ADMIN',
                  'ADMIN_EXISTS',
                ].includes(error.code)
              ? 409
              : ['SUPER_ADMIN_REQUIRED', 'USER_MANAGEMENT_REQUIRED'].includes(
                    error.code,
                  )
                ? 403
                : 400;
      return reply.code(status).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
        },
      });
    });
    const cookie = {
      httpOnly: true,
      secure: production,
      sameSite: 'strict' as const,
      path: '/',
    };
    const credentialLimit = {
      max: 5,
      timeWindow: 60000,
      keyGenerator: (request: FastifyRequest) => {
        const body = request.body;
        const identifier =
          body && typeof body === 'object'
            ? 'identifier' in body
              ? body.identifier
              : 'email' in body
                ? body.email
                : ''
            : '';
        return `${request.ip}:${typeof identifier === 'string' ? identifier.trim().toLowerCase() : ''}`;
      },
    };
    routes.get(
      '/api/auth/session',
      {
        schema: {
          tags: ['Identidad'],
          response: { 200: SessionSchema, 401: ErrorSchema },
        },
      },
      (request) => access.actor(request),
    );
    routes.post(
      '/api/auth/login',
      {
        config: { rateLimit: credentialLimit },
        schema: {
          tags: ['Identidad'],
          body: LoginSchema,
          response: {
            200: SessionSchema,
            400: ErrorSchema,
            401: ErrorSchema,
            403: ErrorSchema,
            429: ErrorSchema,
          },
        },
      },
      async (request, reply) => {
        access.checkOrigin(request);
        const result = await identity.login(
          'identifier' in request.body
            ? request.body.identifier
            : request.body.email,
          request.body.password,
          request.cookies[SESSION_COOKIE],
        );
        reply.setCookie(SESSION_COOKIE, result.token, {
          ...cookie,
          maxAge: sessionHours * 3600,
          expires: result.expiresAt,
        });
        // Resolver con la cookie nueva sin registrar el token en respuesta ni logs.
        request.cookies[SESSION_COOKIE] = result.token;
        return access.actor(request);
      },
    );
    routes.post(
      '/api/auth/logout',
      {
        schema: {
          tags: ['Identidad'],
          response: { 204: Type.Null(), 401: ErrorSchema, 403: ErrorSchema },
        },
      },
      async (request, reply) => {
        await access.mutation(request);
        await identity.logout(request.cookies[SESSION_COOKIE] as string);
        reply.clearCookie(SESSION_COOKIE, cookie);
        return reply.code(204).send(null);
      },
    );
    routes.post(
      '/api/auth/change-password',
      {
        config: { rateLimit: { max: 5, timeWindow: 60000 } },
        schema: { tags: ['Identidad'], body: ChangePasswordSchema },
      },
      async (request, reply) => {
        const actor = await access.mutation(request);
        await identity.changePassword(
          actor.user.id,
          request.body.currentPassword,
          request.body.password,
        );
        reply.clearCookie(SESSION_COOKIE, cookie);
        return reply.code(204).send(null);
      },
    );
    routes.post(
      '/api/auth/recover',
      {
        config: { rateLimit: { max: 5, timeWindow: 60000 } },
        schema: { tags: ['Identidad'], body: RecoverySchema },
      },
      async (request, reply) => {
        access.checkOrigin(request);
        await identity.recover(request.body.token, request.body.password);
        reply.clearCookie(SESSION_COOKIE, cookie);
        return reply.code(204).send(null);
      },
    );
    routes.get(
      '/api/users',
      { schema: { tags: ['Usuarios'], response: { 200: UserListSchema } } },
      async (request) => {
        await access.admin(request);
        return { items: await identity.listUsers() };
      },
    );
    routes.get(
      '/api/users/directory',
      {
        schema: { tags: ['Usuarios'], response: { 200: UserDirectorySchema } },
      },
      async (request) => {
        await access.management(request);
        return identity.directory();
      },
    );
    routes.post(
      '/api/users',
      {
        schema: {
          tags: ['Usuarios'],
          body: UserInputSchema,
          response: { 201: UserSchema },
        },
      },
      async (request, reply) => {
        await access.admin(request, true);
        return reply.code(201).send(await identity.createUser(request.body));
      },
    );
    routes.put(
      '/api/users/:id',
      {
        schema: {
          tags: ['Usuarios'],
          params: IdParamsSchema,
          body: UserUpdateSchema,
          response: { 200: UserSchema },
        },
      },
      async (request) => {
        await access.admin(request, true);
        return identity.updateUser(request.params.id, request.body);
      },
    );
    routes.post(
      '/api/users/:id/recovery',
      {
        schema: {
          tags: ['Usuarios'],
          params: IdParamsSchema,
          response: { 200: RecoveryTokenSchema },
        },
      },
      async (request) => {
        await access.admin(request, true);
        return identity.issueRecovery(request.params.id);
      },
    );
  });
}
