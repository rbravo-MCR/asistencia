import { and, asc, eq, inArray, isNull, lte, gte, or, sql } from 'drizzle-orm';
import type {
  SessionView,
  LocationInput,
  LocationAuthorizationInput,
  GeoCheckInput,
} from '@asistencia/contracts';
import type { Database } from '../../infrastructure/database/client.js';
import { employees } from '../employees/schema.js';
import { recordAudit, enqueueNotifications } from '../audit/index.js';
import { workLocations, locationAuthorizations, geoChecks } from './schema.js';
import {
  evaluateGeofence,
  validPoint,
  LocationError,
} from './domain/geofence.js';
type Executor = Pick<
  Database,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;
function fail(message: string, code = 'INVALID_LOCATION'): never {
  throw new LocationError(code, message);
}
async function lock(tx: Executor) {
  await tx.execute(sql`select pg_advisory_xact_lock(81209002)`);
  await tx.execute(sql`select pg_advisory_xact_lock(81212001)`);
}
function visible(scope: SessionView) {
  return scope.permissions.viewAllEmployees
    ? undefined
    : or(
        eq(
          employees.id,
          scope.employeeId ?? '00000000-0000-0000-0000-000000000000',
        ),
        inArray(employees.departmentId, scope.managedDepartmentIds),
      );
}
function normalized(input: LocationInput) {
  const name = input.name.normalize('NFC').trim();
  if (
    !name ||
    name.length > 120 ||
    name.includes('\0') ||
    !validPoint(input) ||
    !Number.isFinite(input.radiusMeters) ||
    input.radiusMeters <= 0 ||
    input.radiusMeters > 100000 ||
    !Number.isFinite(input.maxAccuracyMeters) ||
    input.maxAccuracyMeters <= 0 ||
    input.maxAccuracyMeters > 100000
  )
    fail('Centro o política de ubicación inválidos.');
  return { ...input, name };
}
function dateValid(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export async function initializeLocationDefaults(tx: Executor): Promise<void> {
  await lock(tx);
  await tx
    .insert(workLocations)
    .values({
      id: '81212000-0000-4000-8000-000000000001',
      name: 'Centro de trabajo principal',
      latitude: 21.0364532482013,
      longitude: -89.62273424224803,
      radiusMeters: 10,
      maxAccuracyMeters: 10,
      active: true,
    })
    .onConflictDoNothing();
}
export function createLocationService(db: Database) {
  async function save(input: LocationInput, actorId: string, id?: string) {
    return db.transaction(async (tx) => {
      await lock(tx);
      const data = normalized(input);
      const [before] = id
        ? await tx.select().from(workLocations).where(eq(workLocations.id, id))
        : [];
      if (id && !before) fail('Centro no encontrado.', 'LOCATION_NOT_FOUND');
      const [row] = id
        ? await tx
            .update(workLocations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(workLocations.id, id))
            .returning()
        : await tx.insert(workLocations).values(data).returning();
      if (!row) throw new Error('No se pudo guardar el centro.');
      await recordAudit(tx, {
        action: id ? 'location.updated' : 'location.created',
        entityType: 'work_location',
        entityId: row.id,
        before: before ?? null,
        after: row,
        actorId,
      });
      return row;
    });
  }
  async function notify(tx: Executor, eventId: string, employeeId: string) {
    const [employee] = await tx
      .select({ userId: employees.userId })
      .from(employees)
      .where(eq(employees.id, employeeId));
    await enqueueNotifications(tx, {
      eventId,
      recipientIds: employee?.userId ? [employee.userId] : [],
      title: 'Autorización de centro actualizada',
      message: 'Se actualizó tu autorización de centro de trabajo.',
      href: '/ubicaciones',
    });
  }
  return {
    create: (input: LocationInput, actorId: string) => save(input, actorId),
    update: (id: string, input: LocationInput, actorId: string) =>
      save(input, actorId, id),
    async list(scope: SessionView) {
      if (scope.permissions.viewAllEmployees)
        return db.select().from(workLocations).orderBy(asc(workLocations.name));
      const auths = await db
        .select({ locationId: locationAuthorizations.locationId })
        .from(locationAuthorizations)
        .innerJoin(
          employees,
          eq(employees.id, locationAuthorizations.employeeId),
        )
        .where(visible(scope));
      return db
        .select()
        .from(workLocations)
        .where(
          inArray(
            workLocations.id,
            auths.map((a) => a.locationId),
          ),
        )
        .orderBy(asc(workLocations.name));
    },
    async delete(id: string, actorId: string) {
      try {
        await db.transaction(async (tx) => {
          await lock(tx);
          const [before] = await tx
            .select()
            .from(workLocations)
            .where(eq(workLocations.id, id));
          if (!before) fail('Centro no encontrado.', 'LOCATION_NOT_FOUND');
          await tx.delete(workLocations).where(eq(workLocations.id, id));
          await recordAudit(tx, {
            action: 'location.deleted',
            entityType: 'work_location',
            entityId: id,
            before,
            actorId,
          });
        });
      } catch (error) {
        const cause = error instanceof Error ? error.cause : undefined;
        if (
          cause &&
          typeof cause === 'object' &&
          'code' in cause &&
          cause.code === '23503'
        )
          fail(
            'El centro conserva referencias. Desactívalo para preservar el historial.',
            'LOCATION_IN_USE',
          );
        throw error;
      }
    },
    async listAuthorizations(scope: SessionView) {
      return db
        .select({ authorization: locationAuthorizations })
        .from(locationAuthorizations)
        .innerJoin(
          employees,
          eq(employees.id, locationAuthorizations.employeeId),
        )
        .where(visible(scope))
        .orderBy(asc(locationAuthorizations.startsOn))
        .then((rows) => rows.map((r) => r.authorization));
    },
    async authorize(input: LocationAuthorizationInput, actorId: string) {
      return db.transaction(async (tx) => {
        await lock(tx);
        if (
          !dateValid(input.startsOn) ||
          (input.endsOn !== null &&
            (!dateValid(input.endsOn) || input.endsOn < input.startsOn))
        )
          fail('Las fechas efectivas de autorización no son válidas.');
        const [employee] = await tx
          .select()
          .from(employees)
          .where(eq(employees.id, input.employeeId));
        const [site] = await tx
          .select()
          .from(workLocations)
          .where(eq(workLocations.id, input.locationId));
        if (
          !employee ||
          employee.status !== 'ACTIVE' ||
          employee.category !== 'ADMINISTRATIVE'
        )
          fail('Selecciona un empleado administrativo activo.');
        if (!site?.active) fail('Selecciona un centro activo.');
        const [row] = await tx
          .insert(locationAuthorizations)
          .values({ ...input, createdBy: actorId })
          .returning();
        if (!row) throw new Error('No se pudo autorizar el centro.');
        const eventId = await recordAudit(tx, {
          action: 'location.authorization.created',
          entityType: 'location_authorization',
          entityId: row.id,
          after: row,
          actorId,
        });
        await notify(tx, eventId, row.employeeId);
        return row;
      });
    },
    async revoke(id: string, actorId: string) {
      await db.transaction(async (tx) => {
        await lock(tx);
        const [before] = await tx
          .select()
          .from(locationAuthorizations)
          .where(eq(locationAuthorizations.id, id));
        if (!before) fail('Autorización no encontrada.', 'LOCATION_NOT_FOUND');
        if (before.revokedAt) return;
        const [after] = await tx
          .update(locationAuthorizations)
          .set({ revokedAt: new Date() })
          .where(eq(locationAuthorizations.id, id))
          .returning();
        if (!after) throw new Error('No se pudo revocar la autorización.');
        const eventId = await recordAudit(tx, {
          action: 'location.authorization.revoked',
          entityType: 'location_authorization',
          entityId: id,
          before,
          after,
          actorId,
        });
        await notify(tx, eventId, before.employeeId);
      });
    },
    async validate(input: GeoCheckInput, scope: SessionView) {
      return db.transaction(async (tx) => {
        await lock(tx);
        const id = input.employeeId ?? scope.employeeId;
        if (!id) fail('Tu cuenta requiere un empleado vinculado.');
        const [employee] = await tx
          .select()
          .from(employees)
          .where(and(eq(employees.id, id), visible(scope)));
        if (!employee || employee.status !== 'ACTIVE')
          fail('Empleado no encontrado.', 'LOCATION_NOT_FOUND');
        return recordLocationCheck(tx, {
          ...input,
          employeeId: id,
          actorId: scope.user.id,
          modality:
            employee.category === 'OPERATIONAL' ? 'HOME_OFFICE' : 'ONSITE',
          checkedAt: new Date(),
          timeZone: 'America/Merida',
        });
      });
    },
  };
}
export type LocationService = ReturnType<typeof createLocationService>;

export async function recordLocationCheck(
  tx: Executor,
  input: GeoCheckInput & {
    employeeId: string;
    actorId: string;
    modality: 'ONSITE' | 'HOME_OFFICE';
    requiredLocationId?: string | null;
    checkedAt: Date;
    timeZone: string;
  },
) {
  const id = input.employeeId;
  const home = input.modality === 'HOME_OFFICE';
  const checkedAt = input.checkedAt;
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: input.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(checkedAt);
  const sites = home
    ? []
    : await tx
        .select({
          site: workLocations,
          authorization: locationAuthorizations,
        })
        .from(locationAuthorizations)
        .innerJoin(
          workLocations,
          eq(workLocations.id, locationAuthorizations.locationId),
        )
        .where(
          and(
            eq(locationAuthorizations.employeeId, id),
            isNull(locationAuthorizations.revokedAt),
            eq(workLocations.active, true),
            input.requiredLocationId
              ? eq(workLocations.id, input.requiredLocationId)
              : undefined,
            lte(locationAuthorizations.startsOn, date),
            or(
              isNull(locationAuthorizations.endsOn),
              gte(locationAuthorizations.endsOn, date),
            ),
          ),
        );
  const verdict = evaluateGeofence(
    home,
    sites.map((r) => r.site),
    input,
  );
  const point =
    !home && validPoint(input)
      ? {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy:
            Number.isFinite(input.accuracy) && input.accuracy! >= 0
              ? input.accuracy
              : null,
        }
      : { latitude: null, longitude: null, accuracy: null };
  const [row] = await tx
    .insert(geoChecks)
    .values({
      ...verdict,
      ...point,
      employeeId: id,
      checkedAt,
      createdBy: input.actorId,
      policySnapshot: {
        version: 1,
        timezone: input.timeZone,
        modality: input.modality,
        date,
        sites: sites.map(({ site, authorization }) => ({
          id: site.id,
          latitude: site.latitude,
          longitude: site.longitude,
          radiusMeters: site.radiusMeters,
          maxAccuracyMeters: site.maxAccuracyMeters,
          authorizationId: authorization.id,
          startsOn: authorization.startsOn,
          endsOn: authorization.endsOn,
        })),
      },
    })
    .returning();
  if (!row) throw new Error('No se pudo conservar la validación.');
  await recordAudit(tx, {
    action: 'location.validated',
    entityType: 'geo_check',
    entityId: row.id,
    after: {
      employeeId: id,
      result: row.result,
      locationId: row.locationId,
    },
    actorId: input.actorId,
  });
  return {
    id: row.id,
    employeeId: row.employeeId,
    result: verdict.result,
    checkedAt: row.checkedAt,
    distanceMeters: row.distanceMeters,
    locationId: row.locationId,
  };
}
