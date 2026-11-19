import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  boolean,
  timestamp,
  date,
  jsonb,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from '../employees/schema.js';
import { users } from '../identity/schema.js';
const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date', precision: 3 });
export const workLocations = pgTable(
  'work_locations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    radiusMeters: doublePrecision('radius_meters').notNull().default(10),
    maxAccuracyMeters: doublePrecision('max_accuracy_meters')
      .notNull()
      .default(10),
    active: boolean('active').notNull().default(true),
    createdAt: instant('created_at').notNull().defaultNow(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check(
      'locations_coordinates',
      sql`${t.latitude} between -90 and 90 and ${t.longitude} between -180 and 180`,
    ),
    check(
      'locations_policy',
      sql`${t.radiusMeters}>0 and ${t.radiusMeters}<=100000 and ${t.maxAccuracyMeters}>0 and ${t.maxAccuracyMeters}<=100000`,
    ),
    check(
      'locations_name',
      sql`char_length(btrim(${t.name})) between 1 and 120`,
    ),
  ],
);
export const locationAuthorizations = pgTable(
  'location_authorizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    locationId: uuid('location_id')
      .notNull()
      .references(() => workLocations.id),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on'),
    revokedAt: instant('revoked_at'),
    createdAt: instant('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    check(
      'location_authorizations_dates',
      sql`${t.endsOn} is null or ${t.endsOn}>=${t.startsOn}`,
    ),
    index('location_authorizations_employee_idx').on(t.employeeId),
  ],
);
export const geoChecks = pgTable(
  'geo_checks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    locationId: uuid('location_id').references(() => workLocations.id),
    result: text('result').notNull(),
    checkedAt: instant('checked_at').notNull().defaultNow(),
    distanceMeters: doublePrecision('distance_meters'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    accuracy: doublePrecision('accuracy'),
    policySnapshot: jsonb('policy_snapshot').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    check(
      'geo_checks_result',
      sql`${t.result} in ('VALID','OUTSIDE_GEOFENCE','ACCURACY_INSUFFICIENT','LOCATION_REQUIRED','NO_AUTHORIZED_LOCATION','NOT_REQUIRED')`,
    ),
  ],
);
