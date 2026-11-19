import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
export const userRole = pgEnum('user_role', [
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'EMPLOYEE',
]);
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    username: text('username').unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'users_username_numeric',
      sql`${table.username} is null or ${table.username} ~ '^[0-9]{1,30}$'`,
    ),
  ],
);
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRole('role').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
);
export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_expiry_idx').on(table.expiresAt),
  ],
);
export const recoveryTokens = pgTable(
  'recovery_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    }).notNull(),
    usedAt: timestamp('used_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    }),
  },
  (table) => [
    uniqueIndex('recovery_one_unused_per_user').on(
      table.userId,
      table.tokenHash,
    ),
  ],
);
