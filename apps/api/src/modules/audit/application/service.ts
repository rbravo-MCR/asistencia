import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../../infrastructure/database/client.js';
import { users } from '../../identity/schema.js';
import {
  auditEvents,
  notificationOutbox,
  notifications,
} from '../infrastructure/schema.js';
import { getAuditContext } from './context.js';
type Executor = Pick<Database, 'select' | 'insert' | 'update' | 'execute'>;
const sensitive =
  /password|token|secret|csrf|cookie|authorization|phone|address|email|contact|latitude|longitude|accuracy/i;
function clean(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]';
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => clean(item, depth + 1));
  if (typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitive.test(key))
        .map(([key, item]) => [key, clean(item, depth + 1)]),
    );
  return null;
}
export function auditSnapshot(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value) return null;
  const sanitized = clean(value) as Record<string, unknown>;
  return JSON.stringify(sanitized).length <= 20000
    ? sanitized
    : { truncated: true };
}
export async function recordAudit(
  tx: Executor,
  input: {
    action: string;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    actorId?: string | null;
  },
): Promise<string> {
  const context = getAuditContext();
  const [row] = await tx
    .insert(auditEvents)
    .values({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId:
        input.actorId === undefined
          ? (context?.actorId ?? null)
          : input.actorId,
      requestId: context?.requestId ?? randomUUID(),
      before: auditSnapshot(input.before),
      after: auditSnapshot(
        input.after
          ? {
              ...input.after,
              ...(input.before
                ? {
                    changedFields: Object.keys(input.after).filter(
                      (key) =>
                        key !== 'updatedAt' &&
                        JSON.stringify(input.before?.[key]) !==
                          JSON.stringify(input.after?.[key]),
                    ),
                  }
                : {}),
            }
          : null,
      ),
    })
    .returning({ id: auditEvents.id });
  if (!row) throw new Error('No se pudo registrar la auditoría.');
  return row.id;
}
export async function enqueueNotifications(
  tx: Executor,
  input: {
    eventId: string;
    recipientIds: string[];
    title: string;
    message: string;
    href: string;
  },
): Promise<void> {
  if (
    !input.href.startsWith('/') ||
    input.href.startsWith('//') ||
    input.href.includes('\\') ||
    input.href.includes('\u0000')
  )
    throw new Error('Ruta de aviso inválida.');
  const title = input.title.normalize('NFC').trim();
  const message = input.message.normalize('NFC').trim();
  if (
    !title ||
    [...title].length > 160 ||
    !message ||
    [...message].length > 1000
  )
    throw new Error('Contenido de aviso inválido.');
  const ids = [...new Set(input.recipientIds)];
  if (!ids.length) return;
  await tx
    .insert(notificationOutbox)
    .values(
      ids.map((recipientId) => ({
        eventId: input.eventId,
        recipientId,
        title,
        message,
        href: input.href,
      })),
    )
    .onConflictDoNothing();
}
export async function dispatchNotifications(db: Database): Promise<number> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(notificationOutbox)
      .where(isNull(notificationOutbox.deliveredAt))
      .orderBy(notificationOutbox.createdAt, notificationOutbox.id)
      .limit(50)
      .for('update', { skipLocked: true });
    for (const row of rows) {
      await tx
        .insert(notifications)
        .values({
          outboxId: row.id,
          userId: row.recipientId,
          title: row.title,
          message: row.message,
          href: row.href,
        })
        .onConflictDoNothing();
      await tx
        .update(notificationOutbox)
        .set({
          deliveredAt: new Date(),
          attempts: sql`${notificationOutbox.attempts} + 1`,
        })
        .where(eq(notificationOutbox.id, row.id));
    }
    return rows.length;
  });
}
export function createAuditService(db: Database) {
  return {
    async list(input: {
      limit: number;
      offset: number;
      entityType?: string;
      action?: string;
    }) {
      const filter = and(
        input.entityType
          ? eq(auditEvents.entityType, input.entityType)
          : undefined,
        input.action ? eq(auditEvents.action, input.action) : undefined,
      );
      const [count] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditEvents)
        .where(filter);
      const rows = await db
        .select({ event: auditEvents, actorName: users.name })
        .from(auditEvents)
        .leftJoin(users, eq(users.id, auditEvents.actorId))
        .where(filter)
        .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
        .limit(input.limit)
        .offset(input.offset);
      return {
        items: rows.map(({ event, actorName }) => ({
          ...event,
          actorName,
          createdAt: event.createdAt.toISOString(),
        })),
        total: count?.count ?? 0,
      };
    },
    async inbox(userId: string) {
      const [count] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.readAt)),
        );
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(100);
      return {
        items: rows.map((row) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          href: row.href,
          createdAt: row.createdAt.toISOString(),
          readAt: row.readAt?.toISOString() ?? null,
        })),
        unreadCount: count?.count ?? 0,
      };
    },
    async read(userId: string, id?: string) {
      const rows = await db
        .update(notifications)
        .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
        .where(
          and(
            eq(notifications.userId, userId),
            id ? eq(notifications.id, id) : undefined,
          ),
        )
        .returning({ id: notifications.id });
      return id === undefined || rows.length > 0;
    },
  };
}
export type AuditService = ReturnType<typeof createAuditService>;
