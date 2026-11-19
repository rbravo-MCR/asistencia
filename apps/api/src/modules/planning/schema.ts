import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  date,
  timestamp,
  index,
  check,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { ShiftTemplateInput } from '@asistencia/contracts';
import { employees, employeeCategory } from '../employees/schema.js';
import { workLocations } from '../locations/schema.js';
export const shiftTemplates = pgTable(
  'shift_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    category: employeeCategory('category').notNull(),
    modality: text('modality').$type<'ONSITE' | 'HOME_OFFICE'>().notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    weekdays: jsonb('weekdays').$type<number[]>().notNull(),
    timeZone: text('time_zone').notNull(),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
    defaultKey: text('default_key').unique(),
  },
  (t) => [
    check(
      'shift_template_modality',
      sql`(${t.category} = 'OPERATIONAL' and ${t.modality} = 'HOME_OFFICE') or (${t.category} = 'ADMINISTRATIVE' and ${t.modality} = 'ONSITE')`,
    ),
    check('shift_template_version', sql`${t.version} > 0`),
    check(
      'shift_template_times',
      sql`${t.startTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.endTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.startTime} <> ${t.endTime}`,
    ),
  ],
);
export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
  },
  (t) => [uniqueIndex('holidays_date_unique').on(t.date)],
);
const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date', precision: 3 });
export const scheduleAssignments = pgTable(
  'schedule_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    templateId: uuid('template_id')
      .notNull()
      .references(() => shiftTemplates.id),
    workDate: date('work_date', { mode: 'string' }).notNull(),
    kind: text('kind').$type<'REGULAR' | 'DUTY'>().notNull(),
    locationId: uuid('location_id').references(() => workLocations.id),
    templateVersion: integer('template_version').notNull(),
    startsAt: instant('starts_at').notNull(),
    endsAt: instant('ends_at').notNull(),
    modality: text('modality').$type<'ONSITE' | 'HOME_OFFICE'>().notNull(),
    timeZone: text('time_zone').notNull(),
    templateName: text('template_name').notNull(),
    snapshot: jsonb('snapshot')
      .$type<ShiftTemplateInput & { version: number }>()
      .notNull(),
    status: text('status')
      .$type<'DRAFT' | 'PUBLISHED' | 'CANCELLED'>()
      .notNull()
      .default('DRAFT'),
    publishedAt: instant('published_at'),
    cancelledAt: instant('cancelled_at'),
    cancellationReason: text('cancellation_reason'),
  },
  (t) => [
    index('schedule_employee_interval_idx').on(
      t.employeeId,
      t.startsAt,
      t.endsAt,
    ),
    index('schedule_work_date_idx').on(t.workDate),
    check('schedule_interval', sql`${t.endsAt} > ${t.startsAt}`),
    check('schedule_kind', sql`${t.kind} in ('REGULAR','DUTY')`),
    check(
      'schedule_status',
      sql`${t.status} in ('DRAFT','PUBLISHED','CANCELLED')`,
    ),
    check(
      'schedule_location',
      sql`(${t.modality} = 'ONSITE' and ${t.locationId} is not null) or (${t.modality} = 'HOME_OFFICE' and ${t.locationId} is null)`,
    ),
    check(
      'schedule_lifecycle',
      sql`(${t.status} = 'DRAFT' and ${t.publishedAt} is null and ${t.cancelledAt} is null) or (${t.status} = 'PUBLISHED' and ${t.publishedAt} is not null and ${t.cancelledAt} is null) or (${t.status} = 'CANCELLED' and ${t.cancelledAt} is not null and char_length(btrim(${t.cancellationReason})) > 0)`,
    ),
  ],
);
