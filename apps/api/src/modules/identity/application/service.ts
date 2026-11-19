import {
  recordAudit,
  enqueueNotifications,
  getAuditContext,
} from '../../audit/index.js';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type { UserInput, UserUpdate, UserView } from '@asistencia/contracts';
import type { Database } from '../../../infrastructure/database/client.js';
import {
  users,
  userRoles,
  sessions,
  recoveryTokens,
} from '../infrastructure/schema.js';
import {
  IdentityError,
  normalizeEmail,
  normalizeUserName,
  validatePassword,
  validateRoles,
  type Role,
} from '../domain/policy.js';
import { hashPassword, verifyPassword } from '../infrastructure/password.js';

type Executor = Pick<
  Database,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
export const csrfFor = (token: string): string =>
  createHmac('sha256', token).update('asistencia-csrf-v1').digest('base64url');
const dummyHash = hashPassword(randomBytes(32).toString('base64url'));
const invalidLogin = () =>
  new IdentityError('INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
async function lock(tx: Executor) {
  await tx.execute(sql`select pg_advisory_xact_lock(81209001)`);
}
async function rolesFor(tx: Executor, id: string): Promise<Role[]> {
  return (
    await tx
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, id))
  ).map((row) => row.role);
}
async function view(
  tx: Executor,
  row: typeof users.$inferSelect,
): Promise<UserView> {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    roles: await rolesFor(tx, row.id),
  };
}
async function assertUserAdministrator(tx: Executor, explicitActor?: string) {
  const actorId = explicitActor ?? getAuditContext()?.actorId;
  // No actor denotes a trusted local/bootstrap caller, never an HTTP request.
  if (!actorId) return;
  const [actor] = await tx
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .where(
      and(
        eq(users.id, actorId),
        eq(users.active, true),
        inArray(userRoles.role, ['SUPER_ADMIN', 'ADMIN']),
      ),
    )
    .limit(1);
  if (!actor)
    throw new IdentityError(
      'USER_MANAGEMENT_REQUIRED',
      'Tu cuenta ya no puede administrar usuarios.',
    );
}
export async function assertOrganizationAdministrator(
  tx: Executor,
): Promise<void> {
  await lock(tx);
  const actorId = getAuditContext()?.actorId;
  if (!actorId) return; // Trusted local callers; HTTP always supplies its authenticated actor.
  const [actor] = await tx
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .where(
      and(
        eq(users.id, actorId),
        eq(users.active, true),
        inArray(userRoles.role, ['SUPER_ADMIN', 'ADMIN', 'HR']),
      ),
    )
    .limit(1);
  if (!actor)
    throw new IdentityError(
      'USER_MANAGEMENT_REQUIRED',
      'Tu cuenta ya no puede administrar la organización.',
    );
}
export async function assertCanManageProtectedAccount(
  tx: Executor,
  id: string | undefined,
  nextRoles: Role[] = [],
  explicitActor?: string,
): Promise<void> {
  await lock(tx);
  const protectedAccount =
    nextRoles.includes('SUPER_ADMIN') ||
    Boolean(id && (await rolesFor(tx, id)).includes('SUPER_ADMIN'));
  if (!protectedAccount) return;
  const actorId = explicitActor ?? getAuditContext()?.actorId;
  const [actor] = actorId
    ? await tx
        .select({ id: users.id })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .where(
          and(
            eq(users.id, actorId),
            eq(users.active, true),
            eq(userRoles.role, 'SUPER_ADMIN'),
          ),
        )
        .limit(1)
    : [];
  if (!actor)
    throw new IdentityError(
      'SUPER_ADMIN_REQUIRED',
      'Solo un superadministrador activo puede administrar esta cuenta protegida.',
    );
}
async function ensureLastAdmin(
  tx: Executor,
  id: string,
  nextActive: boolean,
  nextRoles: Role[],
) {
  const [current] = await tx.select().from(users).where(eq(users.id, id));
  if (!current)
    throw new IdentityError('USER_NOT_FOUND', 'Usuario no encontrado.');
  const roles = await rolesFor(tx, id);
  if (
    current.active &&
    roles.includes('SUPER_ADMIN') &&
    (!nextActive || !nextRoles.includes('SUPER_ADMIN'))
  ) {
    const [other] = await tx
      .select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .where(
        and(
          eq(users.active, true),
          eq(userRoles.role, 'SUPER_ADMIN'),
          ne(users.id, id),
        ),
      )
      .limit(1);
    if (!other)
      throw new IdentityError(
        'LAST_SUPER_ADMIN',
        'No se puede desactivar ni retirar al último superadministrador activo.',
      );
  }
  if (
    current.active &&
    roles.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN') &&
    (!nextActive ||
      !nextRoles.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN'))
  ) {
    const [other] = await tx
      .select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .where(
        and(
          eq(users.active, true),
          inArray(userRoles.role, ['ADMIN', 'SUPER_ADMIN']),
          ne(users.id, id),
        ),
      )
      .limit(1);
    if (!other)
      throw new IdentityError(
        'LAST_ADMIN',
        'No se puede desactivar o retirar al último administrador activo.',
      );
  }
}
export async function disableAccountForEmployee(
  tx: Executor,
  id: string,
): Promise<void> {
  await lock(tx);
  await assertCanManageProtectedAccount(tx, id);
  await ensureLastAdmin(tx, id, false, await rolesFor(tx, id));
  await tx.update(users).set({ active: false }).where(eq(users.id, id));
  await recordAudit(tx, {
    action: 'USER_DEACTIVATED',
    entityType: 'user',
    entityId: id,
    after: { active: false },
  });
  await tx.delete(sessions).where(eq(sessions.userId, id));
  await tx.delete(recoveryTokens).where(eq(recoveryTokens.userId, id));
}
function uniqueError(error: unknown): never {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error && 'code' in cause && cause.code === '23505')
    throw new IdentityError(
      'ACCOUNT_CONFLICT',
      'El correo ya está registrado.',
    );
  throw error;
}
export function createIdentityService(
  db: Database,
  options: { sessionHours: number } = { sessionHours: 8 },
) {
  async function insertUser(
    tx: Executor,
    input: UserInput,
    encoded: string,
    username?: string,
  ) {
    const [row] = await tx
      .insert(users)
      .values({
        email: normalizeEmail(input.email),
        username,
        name: normalizeUserName(input.name),
        passwordHash: encoded,
        active: input.active,
      })
      .returning();
    if (!row) throw new Error('No se pudo crear el usuario.');
    await tx
      .insert(userRoles)
      .values(
        validateRoles(input.roles).map((role) => ({ userId: row.id, role })),
      );
    const created = await view(tx, row);
    await recordAudit(tx, {
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: row.id,
      after: { ...created, username: username ?? null },
    });
    return created;
  }
  return {
    async createUser(input: UserInput): Promise<UserView> {
      validatePassword(input.password);
      const encoded = await hashPassword(input.password);
      try {
        return await db.transaction(async (tx) => {
          await lock(tx);
          await assertUserAdministrator(tx);
          await assertCanManageProtectedAccount(tx, undefined, input.roles);
          return insertUser(tx, input, encoded);
        });
      } catch (error) {
        return uniqueError(error);
      }
    },
    async createInitialAdmin(input: {
      email: string;
      name: string;
      password: string;
    }): Promise<UserView> {
      validatePassword(input.password);
      const encoded = await hashPassword(input.password);
      try {
        return await db.transaction(async (tx) => {
          await lock(tx);
          const existing = await tx
            .select()
            .from(userRoles)
            .where(inArray(userRoles.role, ['SUPER_ADMIN', 'ADMIN']))
            .limit(1);
          if (existing.length)
            throw new IdentityError(
              'ADMIN_EXISTS',
              'Ya existe un administrador. Usa la gestión de usuarios.',
            );
          return insertUser(
            tx,
            { ...input, roles: ['ADMIN'], active: true },
            encoded,
            '999999',
          );
        });
      } catch (error) {
        return uniqueError(error);
      }
    },
    async listUsers(): Promise<UserView[]> {
      const rows = await db.select().from(users).orderBy(users.email);
      return Promise.all(rows.map((row) => view(db, row)));
    },
    async directory() {
      return {
        items: await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            active: users.active,
          })
          .from(users)
          .orderBy(users.name),
      };
    },
    async updateUser(id: string, input: UserUpdate): Promise<UserView> {
      const email = normalizeEmail(input.email);
      const name = normalizeUserName(input.name);
      const roles = validateRoles(input.roles);
      try {
        return await db.transaction(async (tx) => {
          await lock(tx);
          await assertUserAdministrator(tx);
          await assertCanManageProtectedAccount(tx, id, roles);
          await ensureLastAdmin(tx, id, input.active, roles);
          const [previousRow] = await tx
            .select()
            .from(users)
            .where(eq(users.id, id));
          const previousRoles = await rolesFor(tx, id);
          const [row] = await tx
            .update(users)
            .set({ email, name, active: input.active })
            .where(eq(users.id, id))
            .returning();
          if (!row)
            throw new IdentityError('USER_NOT_FOUND', 'Usuario no encontrado.');
          await tx.delete(userRoles).where(eq(userRoles.userId, id));
          await tx
            .insert(userRoles)
            .values(roles.map((role) => ({ userId: id, role })));
          await tx.delete(sessions).where(eq(sessions.userId, id));
          if (
            !input.active ||
            roles.includes('SUPER_ADMIN') !==
              previousRoles.includes('SUPER_ADMIN')
          )
            await tx
              .delete(recoveryTokens)
              .where(eq(recoveryTokens.userId, id));
          const updated = await view(tx, row);
          const eventId = await recordAudit(tx, {
            action: 'USER_UPDATED',
            entityType: 'user',
            entityId: id,
            before: previousRow
              ? { ...previousRow, roles: previousRoles }
              : null,
            after: { ...updated },
          });
          await enqueueNotifications(tx, {
            eventId,
            recipientIds: [id],
            title: 'Cuenta actualizada',
            message:
              'La administración actualizó tu cuenta o permisos. Ingresa de nuevo para continuar.',
            href: '/cuenta',
          });
          return updated;
        });
      } catch (error) {
        return uniqueError(error);
      }
    },
    async login(identifier: string, password: string, previousToken?: string) {
      const normalized = identifier.trim().toLowerCase();
      if (
        !/^[0-9]{1,30}$/.test(normalized) &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
      )
        throw invalidLogin();
      const [row] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, normalized), eq(users.username, normalized)));
      const valid = await verifyPassword(
        row?.passwordHash ?? (await dummyHash),
        password,
      );
      if (!row?.active || !valid) {
        await recordAudit(db, {
          action: 'LOGIN_FAILED',
          entityType: 'user',
          entityId: row?.id ?? randomUUID(),
          actorId: null,
        });
        throw invalidLogin();
      }
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + options.sessionHours * 3600000);
      await db.transaction(async (tx) => {
        const [active] = await tx
          .select()
          .from(users)
          .where(eq(users.id, row.id))
          .for('update');
        if (!active?.active || active.passwordHash !== row.passwordHash)
          throw invalidLogin();
        if (previousToken)
          await tx
            .delete(sessions)
            .where(eq(sessions.tokenHash, hashToken(previousToken)));
        await tx.delete(sessions).where(lt(sessions.expiresAt, new Date()));
        await tx
          .insert(sessions)
          .values({ tokenHash: hashToken(token), userId: row.id, expiresAt });
        await recordAudit(tx, {
          action: 'LOGIN_SUCCESS',
          entityType: 'user',
          entityId: row.id,
          actorId: row.id,
          after: { expiresAt },
        });
      });
      return { token, user: await view(db, row), expiresAt };
    },
    async session(token: string) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const [result] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.tokenHash, hashToken(token)),
            gt(sessions.expiresAt, new Date()),
            eq(users.active, true),
          ),
        );
      return result
        ? {
            token,
            user: await view(db, result.user),
            expiresAt: result.session.expiresAt,
          }
        : null;
    },
    async logout(token: string) {
      await db.transaction(async (tx) => {
        const rows = await tx
          .delete(sessions)
          .where(eq(sessions.tokenHash, hashToken(token)))
          .returning({ userId: sessions.userId });
        if (rows[0])
          await recordAudit(tx, {
            action: 'LOGOUT',
            entityType: 'user',
            entityId: rows[0].userId,
            actorId: rows[0].userId,
          });
      });
    },
    async changePassword(id: string, current: string, password: string) {
      validatePassword(password);
      const [row] = await db.select().from(users).where(eq(users.id, id));
      if (!row?.active || !(await verifyPassword(row.passwordHash, current)))
        throw new IdentityError(
          'INVALID_CURRENT_PASSWORD',
          'La contraseña actual es incorrecta.',
        );
      const encoded = await hashPassword(password);
      await db.transaction(async (tx) => {
        await lock(tx);
        const [locked] = await tx
          .select()
          .from(users)
          .where(eq(users.id, id))
          .for('update');
        if (!locked?.active || locked.passwordHash !== row.passwordHash)
          throw invalidLogin();
        await tx
          .update(users)
          .set({ passwordHash: encoded })
          .where(eq(users.id, id));
        await tx.delete(sessions).where(eq(sessions.userId, id));
        await tx.delete(recoveryTokens).where(eq(recoveryTokens.userId, id));
        const eventId = await recordAudit(tx, {
          action: 'PASSWORD_CHANGED',
          entityType: 'user',
          entityId: id,
          actorId: id,
        });
        await enqueueNotifications(tx, {
          eventId,
          recipientIds: [id],
          title: 'Contraseña actualizada',
          message: 'La contraseña de tu cuenta fue actualizada.',
          href: '/cuenta',
        });
      });
    },
    async issueRecovery(id: string, actorId?: string) {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 1800000);
      await db.transaction(async (tx) => {
        await lock(tx);
        await assertUserAdministrator(tx, actorId);
        await assertCanManageProtectedAccount(tx, id, [], actorId);
        const [row] = await tx
          .select()
          .from(users)
          .where(eq(users.id, id))
          .for('update');
        if (!row?.active)
          throw new IdentityError('USER_NOT_FOUND', 'Usuario no disponible.');
        await tx.delete(recoveryTokens).where(eq(recoveryTokens.userId, id));
        await tx
          .insert(recoveryTokens)
          .values({ tokenHash: hashToken(token), userId: id, expiresAt });
        await recordAudit(tx, {
          action: 'RECOVERY_ISSUED',
          entityType: 'user',
          entityId: id,
          after: { expiresAt },
        });
      });
      return { token, expiresAt: expiresAt.toISOString() };
    },
    async recover(token: string, password: string) {
      validatePassword(password);
      const encoded = await hashPassword(password);
      await db.transaction(async (tx) => {
        await lock(tx);
        const [recovery] = await tx
          .select()
          .from(recoveryTokens)
          .where(
            and(
              eq(recoveryTokens.tokenHash, hashToken(token)),
              isNull(recoveryTokens.usedAt),
              gt(recoveryTokens.expiresAt, new Date()),
            ),
          )
          .for('update');
        if (!recovery)
          throw new IdentityError(
            'INVALID_RECOVERY',
            'Código de recuperación inválido o vencido.',
          );
        const [row] = await tx
          .select()
          .from(users)
          .where(eq(users.id, recovery.userId))
          .for('update');
        if (!row?.active)
          throw new IdentityError(
            'INVALID_RECOVERY',
            'Código de recuperación inválido o vencido.',
          );
        await tx
          .update(users)
          .set({ passwordHash: encoded })
          .where(eq(users.id, row.id));
        await tx
          .update(recoveryTokens)
          .set({ usedAt: new Date() })
          .where(eq(recoveryTokens.tokenHash, recovery.tokenHash));
        await tx.delete(sessions).where(eq(sessions.userId, row.id));
        const eventId = await recordAudit(tx, {
          action: 'PASSWORD_RECOVERED',
          entityType: 'user',
          entityId: row.id,
          actorId: row.id,
        });
        await enqueueNotifications(tx, {
          eventId,
          recipientIds: [row.id],
          title: 'Acceso recuperado',
          message: 'Se completó una recuperación de acceso de tu cuenta.',
          href: '/cuenta',
        });
      });
    },
  };
}
export type IdentityService = ReturnType<typeof createIdentityService>;
