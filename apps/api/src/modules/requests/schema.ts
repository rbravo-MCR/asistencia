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
  uniqueIndex,
  index,
  check,
  customType,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import type { LeavePolicyView } from '@asistencia/contracts';
import { employees } from '../employees/schema.js';
import { departments } from '../departments/schema.js';
import { users } from '../identity/schema.js';
import { attendanceIncidents } from '../attendance/schema.js';
const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date', precision: 3 });
const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });
export const leavePolicies = pgTable('leave_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull().unique(),
  name: text('name').notNull(),
  entitlements: jsonb('entitlements')
    .$type<{ fromYear: number; days: number }[]>()
    .notNull(),
  administrativeWeekdays: jsonb('administrative_weekdays')
    .$type<number[]>()
    .notNull(),
  operationalWeekdays: jsonb('operational_weekdays')
    .$type<number[]>()
    .notNull(),
  excludeHolidays: boolean('exclude_holidays').notNull(),
  createdAt: instant('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
});
export const permissionTypes = pgTable(
  'permission_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    paid: boolean('paid').notNull(),
    evidenceRequired: boolean('evidence_required').notNull(),
    allowPartial: boolean('allow_partial').notNull(),
    minimumNoticeHours: integer('minimum_notice_hours').notNull().default(0),
    partialOnly: boolean('partial_only').notNull().default(false),
    active: boolean('active').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('permission_types_name').on(sql`lower(btrim(${t.name}))`),
    check(
      'permission_notice_range',
      sql`${t.minimumNoticeHours} between 0 and 8760`,
    ),
    check(
      'permission_partial_required',
      sql`not ${t.partialOnly} or ${t.allowPartial}`,
    ),
  ],
);
export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind')
      .$type<'VACATION' | 'PERMISSION' | 'JUSTIFICATION' | 'CANCELLATION'>()
      .notNull(),
    status: text('status')
      .$type<
        | 'PENDING_HEAD'
        | 'PENDING_DIRECTOR'
        | 'APPROVED'
        | 'REJECTED'
        | 'WITHDRAWN'
        | 'CANCELLED'
      >()
      .notNull()
      .default('PENDING_HEAD'),
    employeeId: uuid('employee_id')
      .references(() => employees.id)
      .notNull(),
    departmentId: uuid('department_id')
      .references(() => departments.id)
      .notNull(),
    reason: text('reason').notNull(),
    fromDate: date('from_date', { mode: 'string' }).notNull(),
    toDate: date('to_date', { mode: 'string' }).notNull(),
    partialStartsAt: instant('partial_starts_at'),
    partialEndsAt: instant('partial_ends_at'),
    vacationPeriodYear: integer('vacation_period_year'),
    days: integer('days').notNull().default(0),
    chargedDates: jsonb('charged_dates')
      .$type<string[]>()
      .notNull()
      .default([]),
    policySnapshot: jsonb('policy_snapshot').$type<LeavePolicyView>(),
    permissionTypeId: uuid('permission_type_id').references(
      () => permissionTypes.id,
    ),
    permissionSnapshot: jsonb('permission_snapshot').$type<{
      name: string;
      paid: boolean;
      evidenceRequired: boolean;
      allowPartial: boolean;
      minimumNoticeHours?: number;
      partialOnly?: boolean;
      version: number;
    }>(),
    incidentId: uuid('incident_id').references(() => attendanceIncidents.id),
    originalRequestId: uuid('original_request_id').references(
      (): AnyPgColumn => leaveRequests.id,
    ),
    approvalFlow: text('approval_flow')
      .$type<'HEAD_ONLY' | 'HEAD_DIRECTOR'>()
      .notNull()
      .default('HEAD_ONLY'),
    headMode: text('head_mode').$type<'DEPARTMENT' | 'SUPERVISOR'>().notNull(),
    createdAt: instant('created_at').notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    resolvedAt: instant('resolved_at'),
    withdrawal: jsonb('withdrawal').$type<{
      reason: string;
      actorId: string;
      createdAt: string;
    }>(),
  },
  (t) => [
    index('leave_requests_scope').on(t.departmentId, t.createdAt),
    index('leave_requests_employee').on(t.employeeId, t.fromDate),
    uniqueIndex('leave_incident_active_unique')
      .on(t.incidentId)
      .where(
        sql`${t.kind}='JUSTIFICATION' and ${t.status} in ('PENDING_HEAD','PENDING_DIRECTOR','APPROVED')`,
      ),
    uniqueIndex('leave_cancellation_active_unique')
      .on(t.originalRequestId)
      .where(
        sql`${t.kind}='CANCELLATION' and ${t.status} in ('PENDING_HEAD','PENDING_DIRECTOR','APPROVED')`,
      ),
    check('leave_requests_interval', sql`${t.toDate} >= ${t.fromDate}`),
    check(
      'leave_request_approval_flow',
      sql`${t.approvalFlow} in ('HEAD_ONLY','HEAD_DIRECTOR')`,
    ),
    check(
      'leave_request_director_flow',
      sql`${t.status} <> 'PENDING_DIRECTOR' or ${t.approvalFlow} = 'HEAD_DIRECTOR'`,
    ),
    check(
      'leave_request_kind',
      sql`${t.kind} in ('VACATION','PERMISSION','JUSTIFICATION','CANCELLATION')`,
    ),
    check(
      'leave_request_status',
      sql`${t.status} in ('PENDING_HEAD','PENDING_DIRECTOR','APPROVED','REJECTED','WITHDRAWN','CANCELLED')`,
    ),
  ],
);
export const requestDecisions = pgTable(
  'request_decisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id')
      .references(() => leaveRequests.id)
      .notNull(),
    step: text('step').$type<'HEAD' | 'DIRECTOR'>().notNull(),
    decision: text('decision').$type<'APPROVE' | 'REJECT'>().notNull(),
    reason: text('reason').notNull(),
    actorId: uuid('actor_id')
      .references(() => users.id)
      .notNull(),
    actorName: text('actor_name').notNull(),
    assignmentId: uuid('assignment_id'),
    authoritySnapshot: jsonb('authority_snapshot').notNull(),
    createdAt: instant('created_at').notNull(),
  },
  (t) => [uniqueIndex('request_decision_step_once').on(t.requestId, t.step)],
);
export const requestEvidence = pgTable(
  'request_evidence',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id')
      .references(() => leaveRequests.id)
      .notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    content: bytea('content').notNull(),
  },
  (t) => [
    check('request_evidence_size', sql`${t.sizeBytes} between 1 and 1048576`),
  ],
);
export const vacationMovements = pgTable(
  'vacation_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .references(() => employees.id)
      .notNull(),
    anniversaryYear: integer('anniversary_year').notNull(),
    kind: text('kind').notNull(),
    balanceDelta: integer('balance_delta').notNull(),
    reservedDelta: integer('reserved_delta').notNull(),
    reason: text('reason').notNull(),
    requestId: uuid('request_id').references(() => leaveRequests.id),
    policyId: uuid('policy_id').references(() => leavePolicies.id),
    dedupeKey: text('dedupe_key').unique().notNull(),
    createdAt: instant('created_at').notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
  },
  (t) => [
    index('vacation_movements_employee_period').on(
      t.employeeId,
      t.anniversaryYear,
    ),
    check(
      'vacation_period_positive',
      sql`${t.anniversaryYear} between 1 and 100`,
    ),
  ],
);
export const requestOperations = pgTable('request_operations', {
  idempotencyKey: uuid('idempotency_key').primaryKey(),
  actorId: uuid('actor_id')
    .references(() => users.id)
    .notNull(),
  operation: text('operation').notNull(),
  fingerprint: text('fingerprint').notNull(),
  response: jsonb('response').notNull(),
  createdAt: instant('created_at').defaultNow().notNull(),
});
