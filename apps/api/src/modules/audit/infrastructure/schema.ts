import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { users } from '../../identity/schema.js';
const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date', precision: 3 });
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id'),
    requestId: uuid('request_id').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('audit_events_entity_idx').on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index('audit_events_created_idx').on(table.createdAt, table.id),
  ],
);
export const notificationOutbox = pgTable(
  'notification_outbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => auditEvents.id),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    href: text('href').notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
    deliveredAt: instant('delivered_at'),
    attempts: integer('attempts').notNull().default(0),
  },
  (table) => [
    uniqueIndex('notification_outbox_event_recipient').on(
      table.eventId,
      table.recipientId,
    ),
    index('notification_outbox_pending')
      .on(table.createdAt)
      .where(sql`${table.deliveredAt} is null`),
  ],
);
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    outboxId: uuid('outbox_id')
      .notNull()
      .unique()
      .references(() => notificationOutbox.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    href: text('href').notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
    readAt: instant('read_at'),
  },
  (table) => [
    index('notifications_user_created').on(table.userId, table.createdAt),
    check('notifications_relative_href', sql`${table.href} ~ '^/[^/]'`),
  ],
);
