import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SessionView } from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import {
  createLocationService,
  initializeLocationDefaults,
} from '../src/modules/locations/index.js';
import {
  geoChecks,
  workLocations,
  locationAuthorizations,
} from '../src/modules/locations/schema.js';
import { employees } from '../src/modules/employees/schema.js';
import { departments } from '../src/modules/departments/schema.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw new Error('Se requiere TEST_DATABASE_URL _test.');
const control = createDatabase(source);
const name = `asistencia_locations_${randomUUID().replaceAll('-', '')}_test`;
const url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
const service = createLocationService(database.db);
const app = buildApp(
  parseConfig({
    DATABASE_URL: url.toString(),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  }),
);
let created = false;
let scope: SessionView;
let employeeId: string;
let otherId: string;
let operationalId: string;
let actorId: string;
let otherDepartmentId: string;
let admin: Awaited<ReturnType<typeof login>>;
let member: Awaited<ReturnType<typeof login>>;
const site = {
  name: 'Centro real',
  latitude: 21.0364532482013,
  longitude: -89.62273424224803,
  radiusMeters: 10,
  maxAccuracyMeters: 10,
  active: true,
};
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Merida',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
beforeAll(async () => {
  await control.pool.query(`CREATE DATABASE "${name}"`);
  created = true;
  await runMigrations(database.db);
  const identity = createIdentityService(database.db);
  const first = await identity.createInitialAdmin({
    email: 'location-admin@example.test',
    name: 'Administrador',
    password: TEST_PASSWORD,
  });
  actorId = first.id;
  const user = await identity.createUser({
    email: 'location-user@example.test',
    name: 'Empleado',
    password: TEST_PASSWORD,
    roles: ['EMPLOYEE'],
    active: true,
  });
  const [department] = await database.db
    .insert(departments)
    .values({ name: 'Ubicaciones' })
    .returning();
  const [otherDepartment] = await database.db
    .insert(departments)
    .values({ name: 'Fuera del alcance' })
    .returning();
  otherDepartmentId = otherDepartment!.id;
  const rows = await database.db
    .insert(employees)
    .values([
      {
        employeeNumber: 'L01',
        fullName: 'Presencial',
        departmentId: department!.id,
        position: 'Administración',
        joinedOn: '2026-01-01',
        category: 'ADMINISTRATIVE',
        userId: user.id,
      },
      {
        employeeNumber: 'L02',
        fullName: 'Otro',
        departmentId: otherDepartmentId,
        position: 'Administración',
        joinedOn: '2026-01-01',
        category: 'ADMINISTRATIVE',
      },
      {
        employeeNumber: 'L03',
        fullName: 'Operativo',
        departmentId: department!.id,
        position: 'Operaciones',
        joinedOn: '2026-01-01',
        category: 'OPERATIONAL',
      },
    ])
    .returning();
  employeeId = rows[0]!.id;
  otherId = rows[1]!.id;
  operationalId = rows[2]!.id;
  scope = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: ['EMPLOYEE'],
      active: true,
      createdAt: new Date().toISOString(),
    },
    csrfToken: '',
    expiresAt: new Date().toISOString(),
    employeeId,
    departmentIds: [department!.id],
    managedDepartmentIds: [],
    permissions: {
      manageUsers: false,
      manageOrganization: false,
      viewAllEmployees: false,
    },
  };
  admin = await login(app, first.email);
  member = await login(app, user.email);
});
afterAll(async () => {
  await app.close();
  await database.pool.end();
  try {
    if (created) await control.pool.query(`DROP DATABASE "${name}"`);
  } finally {
    await control.pool.end();
  }
});
it('rejects unauthorized writes and CSRF before persisting', async () => {
  expect((await app.inject('/api/locations')).statusCode).toBe(401);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/locations',
        headers: member.headers,
        payload: site,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/locations',
        headers: { cookie: admin.headers.cookie },
        payload: site,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/locations/validate',
        headers: { cookie: member.headers.cookie },
        payload: {},
      })
    ).statusCode,
  ).toBe(403);
});
it('initializes confirmed location exactly once without resetting edited policy', async () => {
  await database.db.transaction(initializeLocationDefaults);
  await database.db.transaction(initializeLocationDefaults);
  const rows = await database.db.select().from(workLocations);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    latitude: site.latitude,
    longitude: site.longitude,
    radiusMeters: 10,
    maxAccuracyMeters: 10,
  });
  await service.update(rows[0]!.id, { ...site, radiusMeters: 15 }, actorId);
  await database.db.transaction(initializeLocationDefaults);
  expect(
    (await database.db.select().from(workLocations))[0]!.radiusMeters,
  ).toBe(15);
});
it('persists missing/outside/inaccurate checks and immutable policy; private coordinates never leak in API', async () => {
  const location = await service.create(site, actorId);
  await service.authorize(
    { employeeId, locationId: location.id, startsOn: today(), endsOn: today() },
    actorId,
  );
  const missing = await service.validate({}, scope);
  expect(missing.result).toBe('LOCATION_REQUIRED');
  const outside = await service.validate(
    { ...site, latitude: site.latitude + 0.001, accuracy: 1 },
    scope,
  );
  expect(outside.result).toBe('OUTSIDE_GEOFENCE');
  const inaccurate = await service.validate({ ...site, accuracy: 11 }, scope);
  expect(inaccurate.result).toBe('ACCURACY_INSUFFICIENT');
  const valid = await service.validate({ ...site, accuracy: 10 }, scope);
  expect(valid.result).toBe('VALID');
  await service.update(location.id, { ...site, radiusMeters: 20 }, actorId);
  const [stored] = await database.db
    .select()
    .from(geoChecks)
    .where(eq(geoChecks.id, valid.id));
  expect(stored!.policySnapshot).toMatchObject({
    sites: [expect.objectContaining({ radiusMeters: 10 })],
  });
  const response = await app.inject({
    method: 'POST',
    url: '/api/locations/validate',
    headers: member.headers,
    payload: {
      latitude: site.latitude,
      longitude: site.longitude,
      accuracy: 1,
    },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).not.toHaveProperty('latitude');
  expect(response.json()).not.toHaveProperty('policySnapshot');
  await expect(service.delete(location.id, actorId)).rejects.toMatchObject({
    code: 'LOCATION_IN_USE',
  });
});
it('enforces employee scope and allows managed department scope', async () => {
  await expect(
    service.validate({ employeeId: otherId }, scope),
  ).rejects.toMatchObject({ code: 'LOCATION_NOT_FOUND' });
  const manager = { ...scope, managedDepartmentIds: [otherDepartmentId] };
  expect(
    (await service.validate({ employeeId: otherId }, manager)).result,
  ).toBe('NO_AUTHORIZED_LOCATION');
  const location = await service.create(
    { ...site, name: 'Centro ajeno' },
    actorId,
  );
  await service.authorize(
    {
      employeeId: otherId,
      locationId: location.id,
      startsOn: today(),
      endsOn: null,
    },
    actorId,
  );
  expect(
    (await service.list(scope)).some((row) => row.id === location.id),
  ).toBe(false);
  expect(
    (await service.listAuthorizations(scope)).some(
      (row) => row.employeeId === otherId,
    ),
  ).toBe(false);
});
it('home checks do not collect GPS and operational staff cannot be authorized onsite', async () => {
  const homeScope = { ...scope, employeeId: operationalId };
  const result = await service.validate({ ...site, accuracy: 1 }, homeScope);
  expect(result.result).toBe('NOT_REQUIRED');
  const [stored] = await database.db
    .select()
    .from(geoChecks)
    .where(eq(geoChecks.id, result.id));
  expect(stored).toMatchObject({
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceMeters: null,
    locationId: null,
  });
  const location = await service.create(site, actorId);
  await expect(
    service.authorize(
      {
        employeeId: operationalId,
        locationId: location.id,
        startsOn: today(),
        endsOn: null,
      },
      actorId,
    ),
  ).rejects.toMatchObject({ code: 'INVALID_LOCATION' });
});
it('uses inclusive dates, ignores future/expired/revoked sites, rejects inactive references and revokes idempotently', async () => {
  // Revoke other authorizations to isolate the effective-date verdict.
  for (const row of await service.listAuthorizations({
    ...scope,
    permissions: { ...scope.permissions, viewAllEmployees: true },
  }))
    if (row.employeeId === otherId) await service.revoke(row.id, actorId);
  const location = await service.create(site, actorId);
  await service.authorize(
    {
      employeeId: otherId,
      locationId: location.id,
      startsOn: '2099-01-01',
      endsOn: null,
    },
    actorId,
  );
  await service.authorize(
    {
      employeeId: otherId,
      locationId: location.id,
      startsOn: '2020-01-01',
      endsOn: '2020-12-31',
    },
    actorId,
  );
  expect(
    (
      await service.validate(
        { employeeId: otherId, ...site, accuracy: 1 },
        {
          ...scope,
          permissions: { ...scope.permissions, viewAllEmployees: true },
        },
      )
    ).result,
  ).toBe('NO_AUTHORIZED_LOCATION');
  const authorization = await service.authorize(
    {
      employeeId: otherId,
      locationId: location.id,
      startsOn: today(),
      endsOn: today(),
    },
    actorId,
  );
  const adminScope = {
    ...scope,
    permissions: { ...scope.permissions, viewAllEmployees: true },
  };
  expect(
    (
      await service.validate(
        { employeeId: otherId, ...site, accuracy: 1 },
        adminScope,
      )
    ).result,
  ).toBe('VALID');
  await service.revoke(authorization.id, actorId);
  const [before] = await database.db
    .select()
    .from(locationAuthorizations)
    .where(eq(locationAuthorizations.id, authorization.id));
  await service.revoke(authorization.id, actorId);
  const [after] = await database.db
    .select()
    .from(locationAuthorizations)
    .where(eq(locationAuthorizations.id, authorization.id));
  expect(after!.revokedAt).toEqual(before!.revokedAt);
  expect(
    (
      await service.validate(
        { employeeId: otherId, ...site, accuracy: 1 },
        adminScope,
      )
    ).result,
  ).toBe('NO_AUTHORIZED_LOCATION');
  await service.update(location.id, { ...site, active: false }, actorId);
  await expect(
    service.authorize(
      {
        employeeId: otherId,
        locationId: location.id,
        startsOn: today(),
        endsOn: null,
      },
      actorId,
    ),
  ).rejects.toMatchObject({ code: 'INVALID_LOCATION' });
  await database.db
    .update(employees)
    .set({ status: 'INACTIVE' })
    .where(eq(employees.id, otherId));
  await expect(
    service.validate({ employeeId: otherId }, adminScope),
  ).rejects.toMatchObject({ code: 'LOCATION_NOT_FOUND' });
});
