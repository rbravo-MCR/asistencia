import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  integer,
  timestamp,
  jsonb,
  text,
  boolean,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import type {
  AttendancePolicyView,
  AttendancePunchResult,
} from '@asistencia/contracts';
import { scheduleAssignments } from '../planning/schema.js';
import { employees } from '../employees/schema.js';
import { users } from '../identity/schema.js';
import { geoChecks } from '../locations/schema.js';
const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date', precision: 3 });
export const attendancePolicies = pgTable(
  'attendance_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: integer('version').notNull().unique(),
    lateToleranceMinutes: integer('late_tolerance_minutes').notNull(),
    earlyEntryMinutes: integer('early_entry_minutes').notNull(),
    lateExitMinutes: integer('late_exit_minutes').notNull(),
    administrativeAbsenceMinutes: integer('administrative_absence_minutes'),
    activatedAt: instant('activated_at').notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (t) => [
    check(
      'attendance_absence_bounds',
      sql`${t.administrativeAbsenceMinutes} is null or (${t.administrativeAbsenceMinutes} between 1 and 1440 and ${t.administrativeAbsenceMinutes} > ${t.lateToleranceMinutes})`,
    ),
    check(
      'attendance_policy_bounds',
      sql`${t.lateToleranceMinutes} between 0 and 120 and ${t.earlyEntryMinutes} between 0 and 1440 and ${t.lateExitMinutes} between 0 and 1440`,
    ),
  ],
);
export const attendanceSessions = pgTable('attendance_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id')
    .notNull()
    .unique()
    .references(() => scheduleAssignments.id),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  policySnapshot: jsonb('policy_snapshot')
    .$type<AttendancePolicyView>()
    .notNull(),
  createdAt: instant('created_at').notNull(),
});
export const attendanceAttempts = pgTable(
  'attendance_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => scheduleAssignments.id),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    direction: text('direction').$type<'ENTRY' | 'EXIT'>().notNull(),
    recordedAt: instant('recorded_at').notNull(),
    accepted: boolean('accepted').notNull(),
    rejectionCode: text('rejection_code'),
    geoCheckId: uuid('geo_check_id').references(() => geoChecks.id),
    idempotencyKey: uuid('idempotency_key').notNull().unique(),
    requestFingerprint: text('request_fingerprint').notNull(),
    responseSnapshot: jsonb('response_snapshot')
      .$type<AttendancePunchResult>()
      .notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    uniqueIndex('attendance_one_accepted_direction')
      .on(t.sessionId, t.direction)
      .where(sql`${t.accepted}=true`),
    check('attendance_direction', sql`${t.direction} in ('ENTRY','EXIT')`),
  ],
);
export const attendanceIncidents = pgTable('attendance_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => attendanceSessions.id),
  assignmentId: uuid('assignment_id')
    .notNull()
    .references(() => scheduleAssignments.id),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id),
  attemptId: uuid('attempt_id'),
  kind: text('kind').notNull(),
  createdAt: instant('created_at').notNull(),
  dedupeKey: text('dedupe_key').notNull().unique(),
});
export const attendanceReasons = pgTable(
  'attendance_reasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    incidentId: uuid('incident_id')
      .notNull()
      .references(() => attendanceIncidents.id),
    reason: text('reason').notNull(),
    createdAt: instant('created_at').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    check(
      'attendance_reason_length',
      sql`char_length(btrim(${t.reason})) between 1 and 2000`,
    ),
  ],
);
export const attendanceEvaluations = pgTable(
  'attendance_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id),
    evaluatedAt: instant('evaluated_at').notNull(),
    result: text('result').notNull(),
  },
  (t) => [uniqueIndex('attendance_evaluation_once').on(t.sessionId)],
);
