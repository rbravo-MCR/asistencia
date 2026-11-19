import { sql } from 'drizzle-orm';
import {
  pgTable,
  integer,
  numeric,
  pgEnum,
  uuid,
  text,
  date,
  timestamp,
  uniqueIndex,
  index,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from '../../identity/schema.js';
import { departments } from '../../departments/schema.js';
export const employeeCategory = pgEnum('employee_category', [
  'ADMINISTRATIVE',
  'OPERATIONAL',
]);
export const employmentStatus = pgEnum('employment_status', [
  'ACTIVE',
  'INACTIVE',
]);
export const assignmentKind = pgEnum('assignment_kind', [
  'HEAD',
  'DIRECTOR',
  'SUBSTITUTE',
]);
export const employees = pgTable(
  'employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeNumber: text('employee_number').notNull(),
    fullName: text('full_name').notNull(),
    phoneNumber: text('phone_number'),
    address: text('address'),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id),
    position: text('position').notNull(),
    joinedOn: date('joined_on', { mode: 'string' }).notNull(),
    category: employeeCategory('category').notNull(),
    status: employmentStatus('status').notNull().default('ACTIVE'),
    supervisorId: uuid('supervisor_id').references(
      (): AnyPgColumn => employees.id,
    ),
    userId: uuid('user_id')
      .unique()
      .references(() => users.id),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('employees_number_unique').on(
      sql`lower(btrim(${table.employeeNumber}))`,
    ),
    index('employees_department_idx').on(table.departmentId),
    check(
      'employees_no_self_supervisor',
      sql`${table.supervisorId} is null or ${table.supervisorId} <> ${table.id}`,
    ),
    check(
      'employees_number_length',
      sql`char_length(btrim(${table.employeeNumber})) between 1 and 30`,
    ),
    check(
      'employees_name_length',
      sql`char_length(btrim(${table.fullName})) between 1 and 150`,
    ),
    check(
      'employees_phone_format',
      sql`${table.phoneNumber} is null or ${table.phoneNumber} ~ '^[+]?[0-9]{7,15}$'`,
    ),
    check(
      'employees_address_length',
      sql`${table.address} is null or char_length(${table.address}) between 1 and 500`,
    ),
    check(
      'employees_position_length',
      sql`char_length(btrim(${table.position})) between 1 and 120`,
    ),
  ],
);
export const assignments = pgTable(
  'organization_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: assignmentKind('kind').notNull(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    departmentId: uuid('department_id').references(() => departments.id),
    startsAt: timestamp('starts_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    endsAt: timestamp('ends_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    }),
    sourceAssignmentId: uuid('source_assignment_id').references(
      (): AnyPgColumn => assignments.id,
    ),
    reason: text('reason').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    revokedAt: timestamp('revoked_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    }),
  },
  (table) => [
    uniqueIndex('assignments_current_head')
      .on(table.departmentId)
      .where(
        sql`${table.kind} = 'HEAD' and ${table.endsAt} is null and ${table.revokedAt} is null`,
      ),
    uniqueIndex('assignments_current_director')
      .on(table.kind)
      .where(
        sql`${table.kind} = 'DIRECTOR' and ${table.endsAt} is null and ${table.revokedAt} is null`,
      ),
    index('assignments_employee_idx').on(table.employeeId),
    check(
      'assignments_department_kind',
      sql`(${table.kind} = 'DIRECTOR' and ${table.departmentId} is null) or (${table.kind} <> 'DIRECTOR' and ${table.departmentId} is not null)`,
    ),
    check(
      'assignments_interval',
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      'assignments_substitute_finite',
      sql`${table.kind} <> 'SUBSTITUTE' or (${table.endsAt} is not null and ${table.sourceAssignmentId} is not null)`,
    ),
  ],
);

// Contador persistente; una única fila compartida por todos los procesos de API.
export const employeeNumberCounter = pgTable(
  'employee_number_counter',
  {
    id: integer('id').primaryKey(),
    lastValue: numeric('last_value', { precision: 30, scale: 0 }).notNull(),
  },
  (table) => [
    check('employee_number_counter_singleton', sql`${table.id} = 1`),
    check('employee_number_counter_positive', sql`${table.lastValue} > 0`),
  ],
);
