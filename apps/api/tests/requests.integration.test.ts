import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import type { SessionView } from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import { employees, assignments } from '../src/modules/employees/schema.js';
import { departments } from '../src/modules/departments/schema.js';
import {
  createRequestService,
  getApprovedCoverage,
  getIncidentResolution,
} from '../src/modules/requests/index.js';
import { createAttendanceService } from '../src/modules/attendance/index.js';
import { TEST_PASSWORD } from './helpers/auth.js';
import { login } from './helpers/auth.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Require _test');
const control = createDatabase(source),
  name = `requests_${randomUUID().replaceAll('-', '')}_test`,
  url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
const now = new Date('2030-01-10T14:00:00Z');
// Explicit legacy-policy fixtures retain regression coverage of historical requests.
const service = createRequestService(database.db, {
  clock: () => now,
  approvalFlow: 'HEAD_DIRECTOR',
});
let own: SessionView,
  head: SessionView,
  director: SessionView,
  hr: SessionView,
  foreign: SessionView;
let made = false,
  departmentId: string;
async function account(
  label: string,
  roles: ('ADMIN' | 'HR' | 'EMPLOYEE')[] = ['EMPLOYEE'],
) {
  const u = await createIdentityService(database.db).createUser({
    email: `${label}@example.test`,
    name: label,
    password: TEST_PASSWORD,
    roles,
    active: true,
  });
  const [e] = await database.db
    .insert(employees)
    .values({
      employeeNumber: label,
      fullName: label,
      departmentId,
      position: 'Test',
      joinedOn: '2028-02-29',
      category: 'ADMINISTRATIVE',
      userId: u.id,
    })
    .returning();
  return {
    user: { ...u },
    employeeId: e!.id,
    departmentIds: [departmentId],
    managedDepartmentIds: [],
    csrfToken: '',
    expiresAt: '2031-01-01T00:00:00Z',
    permissions: {
      manageUsers: roles.includes('ADMIN'),
      manageOrganization: roles.includes('ADMIN') || roles.includes('HR'),
      viewAllEmployees: roles.includes('ADMIN') || roles.includes('HR'),
    },
  } as SessionView;
}
beforeAll(async () => {
  await control.pool.query(`create database "${name}"`);
  made = true;
  await runMigrations(database.db);
  const [d] = await database.db
    .insert(departments)
    .values({ name: 'Solicitudes' })
    .returning();
  departmentId = d!.id;
  own = await account('Persona');
  head = await account('Jefatura');
  director = await account('Direccion');
  hr = await account('RRHH', ['HR']);
  foreign = await account('Ajeno');
  head.managedDepartmentIds = [departmentId];
  director.permissions.viewAllEmployees = true;
  await database.db.insert(assignments).values([
    {
      kind: 'HEAD',
      employeeId: head.employeeId!,
      departmentId,
      startsAt: new Date('2029-01-01'),
      reason: 'Prueba',
      createdBy: hr.user.id,
    },
    {
      kind: 'DIRECTOR',
      employeeId: director.employeeId!,
      departmentId: null,
      startsAt: new Date('2029-01-01'),
      reason: 'Prueba',
      createdBy: hr.user.id,
    },
  ]);
});
afterAll(async () => {
  await database.pool.end();
  try {
    if (made) await control.pool.query(`drop database "${name}"`);
  } finally {
    await control.pool.end();
  }
});
const key = () => randomUUID();
const policy = {
  name: 'Política explícita prueba',
  entitlements: [
    { fromYear: 1, days: 12 },
    { fromYear: 2, days: 14 },
  ],
  administrativeWeekdays: [1, 2, 3, 4, 5],
  operationalWeekdays: [1, 2, 3, 4, 5, 6, 7],
  excludeHolidays: true,
};
it('replays pre-migration permission responses with historical defaults after configuration changes', async () => {
  const payload = {
    name: 'Permiso respuesta histórica',
    paid: true,
    evidenceRequired: false,
    allowPartial: true,
    active: true,
    idempotencyKey: key(),
  };
  const original = await service.savePermissionType(undefined, payload, hr);
  await database.pool.query(
    "update request_operations set response=response-'minimumNoticeHours'-'partialOnly' where idempotency_key=$1",
    [payload.idempotencyKey],
  );
  await service.savePermissionType(
    original.id,
    {
      ...payload,
      paid: false,
      minimumNoticeHours: 24,
      partialOnly: true,
      idempotencyKey: key(),
    },
    hr,
  );
  const replay = await service.savePermissionType(undefined, payload, hr);
  expect(replay).toMatchObject({
    id: original.id,
    version: 1,
    paid: true,
    minimumNoticeHours: 0,
    partialOnly: false,
  });
});
it('enforces 24 hours before hourly absence, requires hours and freezes paid terms across edits', async () => {
  const person = await account('PermisosHoras');
  const settings = {
    name: 'Entrada tardía anticipada',
    paid: true,
    evidenceRequired: false,
    allowPartial: true,
    active: true,
    minimumNoticeHours: 24,
    partialOnly: true,
  };
  const type = await service.savePermissionType(
    undefined,
    { ...settings, idempotencyKey: key() },
    hr,
  );
  const payload = {
    kind: 'PERMISSION' as const,
    permissionTypeId: type.id,
    fromDate: '2030-01-11',
    toDate: '2030-01-11',
    partialStartsAt: '2030-01-11T13:59:59.999Z',
    partialEndsAt: '2030-01-11T16:00:00Z',
    reason: 'Trámite personal',
    idempotencyKey: key(),
  };
  await expect(service.create(payload, person)).rejects.toMatchObject({
    code: 'INSUFFICIENT_NOTICE',
  });
  expect(await service.list(person)).toHaveLength(0);
  await expect(
    service.create(
      {
        kind: payload.kind,
        permissionTypeId: type.id,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        reason: payload.reason,
        idempotencyKey: key(),
      },
      person,
    ),
  ).rejects.toMatchObject({ code: 'PARTIAL_REQUIRED' });
  await expect(
    service.create(
      {
        ...payload,
        partialStartsAt: '2030-01-11T14:00:00Z',
        reason: ' ',
        idempotencyKey: key(),
      },
      person,
    ),
  ).rejects.toMatchObject({ code: 'INVALID_TEXT' });
  const accepted = await service.create(
    {
      ...payload,
      partialStartsAt: '2030-01-11T14:00:00Z',
      idempotencyKey: key(),
    },
    person,
  );
  expect(accepted.paid).toBe(true);
  expect(accepted.evidence).toEqual([]);
  await expect(
    service.savePermissionType(
      type.id,
      { ...settings, allowPartial: false, idempotencyKey: key() },
      hr,
    ),
  ).rejects.toMatchObject({ code: 'INVALID_PERMISSION_TYPE' });
  await service.savePermissionType(
    type.id,
    { ...settings, paid: false, idempotencyKey: key() },
    hr,
  );
  // Clients omitting the new fields must not silently remove restrictions.
  const edited = await service.savePermissionType(
    type.id,
    {
      name: settings.name,
      paid: false,
      evidenceRequired: false,
      allowPartial: true,
      active: true,
      idempotencyKey: key(),
    },
    hr,
  );
  expect(edited).toMatchObject({
    paid: false,
    minimumNoticeHours: 24,
    partialOnly: true,
  });
  expect((await service.list(person))[0]!.paid).toBe(true);
  const next = await service.create(
    {
      ...payload,
      fromDate: '2030-01-12',
      toDate: '2030-01-12',
      partialStartsAt: '2030-01-12T14:00:00Z',
      partialEndsAt: '2030-01-12T16:00:00Z',
      idempotencyKey: key(),
    },
    person,
  );
  expect(next.paid).toBe(false);
});
it('counts full-day notice from Mérida midnight and preserves unrestricted legacy types', async () => {
  const person = await account('AvisoCivil');
  const settings = {
    name: 'Permiso día con aviso',
    paid: true,
    evidenceRequired: false,
    allowPartial: true,
    active: true,
    minimumNoticeHours: 24,
  };
  const type = await service.savePermissionType(
    undefined,
    { ...settings, idempotencyKey: key() },
    hr,
  );
  const payload = {
    kind: 'PERMISSION' as const,
    fromDate: '2030-01-11',
    toDate: '2030-01-11',
    permissionTypeId: type.id,
    reason: 'Ausencia día completo',
    idempotencyKey: key(),
  };
  // Midnight tomorrow in Mérida is only 16 hours after 08:00 today.
  await expect(service.create(payload, person)).rejects.toMatchObject({
    code: 'INSUFFICIENT_NOTICE',
  });
  const boundary = createRequestService(database.db, {
    clock: () => new Date('2030-01-10T06:00:00Z'),
  });
  const accepted = await boundary.create(
    { ...payload, idempotencyKey: key() },
    person,
  );
  expect(accepted.fromDate).toBe('2030-01-11');
  await expect(
    service.savePermissionType(
      type.id,
      { ...settings, minimumNoticeHours: -1, idempotencyKey: key() },
      hr,
    ),
  ).rejects.toMatchObject({ code: 'INVALID_PERMISSION_TYPE' });
  const legacy = await service.savePermissionType(
    undefined,
    {
      name: 'Permiso histórico libre',
      paid: false,
      evidenceRequired: false,
      allowPartial: false,
      active: true,
      idempotencyKey: key(),
    },
    hr,
  );
  expect(legacy).toMatchObject({ minimumNoticeHours: 0, partialOnly: false });
  const other = await account('AvisoLibre');
  const today = await service.create(
    {
      ...payload,
      permissionTypeId: legacy.id,
      fromDate: '2030-01-10',
      toDate: '2030-01-10',
      idempotencyKey: key(),
    },
    other,
  );
  expect(today.fromDate).toBe('2030-01-10');
});
it('requires explicit policy, grants only completed anniversary and preserves ledger idempotency', async () => {
  await expect(
    service.grant(
      {
        employeeId: own.employeeId!,
        anniversaryYear: 1,
        reason: 'Concesión',
        idempotencyKey: key(),
      },
      hr,
    ),
  ).rejects.toMatchObject({ code: 'POLICY_REQUIRED' });
  await service.savePolicy({ ...policy, idempotencyKey: key() }, hr);
  await expect(
    service.grant(
      {
        employeeId: own.employeeId!,
        anniversaryYear: 2,
        reason: 'Futuro',
        idempotencyKey: key(),
      },
      hr,
    ),
  ).rejects.toMatchObject({ code: 'ANNIVERSARY_NOT_DUE' });
  const payload = {
    employeeId: own.employeeId!,
    anniversaryYear: 1,
    reason: 'Concesión inicial',
    idempotencyKey: key(),
  };
  const [a, b] = await Promise.all([
    service.grant(payload, hr),
    service.grant(payload, hr),
  ]);
  expect(a).toEqual(b);
  expect(a.available).toBe(12);
  expect(a.movements).toHaveLength(1);
  await expect(
    service.grant({ ...payload, idempotencyKey: key() }, hr),
  ).rejects.toMatchObject({ code: 'ALREADY_GRANTED' });
});
it('reserves once concurrently, enforces distinct live approvers and only consumes after director', async () => {
  const payload = {
    kind: 'VACATION' as const,
    fromDate: '2030-02-04',
    toDate: '2030-02-05',
    vacationPeriodYear: 1,
    reason: 'Descanso',
    idempotencyKey: key(),
  };
  const [a, b] = await Promise.all([
    service.create(payload, own),
    service.create(payload, own),
  ]);
  expect(a.id).toBe(b.id);
  expect(a.days).toBe(2);
  expect(a.status).toBe('PENDING_HEAD');
  expect((await service.balances(own))[0]!.available).toBe(10);
  await expect(
    service.decide(
      a.id,
      { decision: 'APPROVE', reason: 'Me apruebo', idempotencyKey: key() },
      own,
    ),
  ).rejects.toMatchObject({ code: 'SELF_APPROVAL' });
  await expect(
    service.decide(
      a.id,
      { decision: 'APPROVE', reason: 'HR no autoriza', idempotencyKey: key() },
      hr,
    ),
  ).rejects.toMatchObject({ code: 'APPROVER_REQUIRED' });
  const h = await service.decide(
    a.id,
    { decision: 'APPROVE', reason: 'Autorizado jefe', idempotencyKey: key() },
    head,
  );
  expect(h.status).toBe('PENDING_DIRECTOR');
  expect((await service.balances(own))[0]!.reserved).toBe(2);
  const decision = {
    decision: 'APPROVE' as const,
    reason: 'Visto bueno',
    idempotencyKey: key(),
  };
  const [x, y] = await Promise.all([
    service.decide(a.id, decision, director),
    service.decide(a.id, decision, director),
  ]);
  expect(x).toEqual(y);
  expect(x.status).toBe('APPROVED');
  expect(x.decisions).toHaveLength(2);
  const balance = (await service.balances(own))[0]!;
  expect(balance.balance).toBe(10);
  expect(balance.reserved).toBe(0);
  expect(balance.approvedDays).toBe(2);
  expect(
    await getApprovedCoverage(database.db, {
      employeeId: own.employeeId!,
      workDate: '2030-02-04',
      startsAt: new Date('2030-02-04T14:00Z'),
      endsAt: new Date('2030-02-04T23:00Z'),
    }),
  ).toMatchObject({ requestId: a.id, kind: 'VACATION' });
});
it('cancels an approved future vacation only after both approvals and reverses once', async () => {
  const original = (await service.list(own)).find(
    (r) => r.kind === 'VACATION',
  )!;
  const cancel = await service.create(
    {
      kind: 'CANCELLATION',
      originalRequestId: original.id,
      reason: 'Cambio de planes',
      idempotencyKey: key(),
    },
    own,
  );
  await expect(
    service.create(
      {
        kind: 'CANCELLATION',
        originalRequestId: original.id,
        reason: 'Duplicado',
        idempotencyKey: key(),
      },
      own,
    ),
  ).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
  expect(
    (await service.list(own)).find((r) => r.id === original.id)!.status,
  ).toBe('APPROVED');
  await service.decide(
    cancel.id,
    { decision: 'APPROVE', reason: 'Acepto', idempotencyKey: key() },
    head,
  );
  await service.decide(
    cancel.id,
    { decision: 'APPROVE', reason: 'Acepto director', idempotencyKey: key() },
    director,
  );
  expect(
    (await service.list(own)).find((r) => r.id === original.id)!.status,
  ).toBe('CANCELLED');
  expect((await service.balances(own))[0]!.available).toBe(12);
});
it('protects private evidence, partial permissions do not cover full shifts, and withdraw releases reservation', async () => {
  const t = await service.savePermissionType(
    undefined,
    {
      name: 'Permiso con goce',
      paid: true,
      evidenceRequired: true,
      allowPartial: true,
      active: true,
      idempotencyKey: key(),
    },
    hr,
  );
  await expect(
    service.create(
      {
        kind: 'PERMISSION',
        permissionTypeId: t.id,
        fromDate: '2030-02-06',
        toDate: '2030-02-06',
        reason: 'Sin evidencia',
        idempotencyKey: key(),
      },
      own,
    ),
  ).rejects.toMatchObject({ code: 'EVIDENCE_REQUIRED' });
  const r = await service.create(
    {
      kind: 'PERMISSION',
      permissionTypeId: t.id,
      fromDate: '2030-02-06',
      toDate: '2030-02-06',
      partialStartsAt: '2030-02-06T16:00:00Z',
      partialEndsAt: '2030-02-06T17:00:00Z',
      reason: 'Consulta',
      evidence: [
        {
          filename: 'constancia.pdf',
          mimeType: 'application/pdf',
          contentBase64: Buffer.from('%PDF-1.7\nfixture').toString('base64'),
        },
      ],
      idempotencyKey: key(),
    },
    own,
  );
  await expect(
    service.evidence(r.id, r.evidence[0]!.id, foreign),
  ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
  expect(
    (await service.evidence(r.id, r.evidence[0]!.id, own)).content.toString(),
  ).toContain('%PDF-');
  await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Sí', idempotencyKey: key() },
    head,
  );
  await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Sí', idempotencyKey: key() },
    director,
  );
  expect(
    await getApprovedCoverage(database.db, {
      employeeId: own.employeeId!,
      workDate: '2030-02-06',
      startsAt: new Date('2030-02-06T14:00Z'),
      endsAt: new Date('2030-02-06T23:00Z'),
    }),
  ).toBeNull();
  const vacation = await service.create(
    {
      kind: 'VACATION',
      fromDate: '2030-03-04',
      toDate: '2030-03-08',
      vacationPeriodYear: 1,
      reason: 'Reserva',
      idempotencyKey: key(),
    },
    own,
  );
  expect((await service.balances(own))[0]!.reserved).toBe(5);
  const withdrawn = await service.withdraw(
    vacation.id,
    { reason: 'Retiro', idempotencyKey: key() },
    own,
  );
  expect(withdrawn.withdrawal).toMatchObject({
    reason: 'Retiro',
    actorId: own.user.id,
    createdAt: now.toISOString(),
  });
  expect(
    (await service.list(own)).find((r) => r.id === vacation.id)?.withdrawal
      ?.reason,
  ).toBe('Retiro');
  expect((await service.balances(own))[0]!.available).toBe(12);
});
it('rejects revoked management authority even if the request scope was resolved earlier', async () => {
  await database.pool.query('delete from user_roles where user_id=$1', [
    hr.user.id,
  ]);
  try {
    await expect(
      service.savePolicy({ ...policy, idempotencyKey: key() }, hr),
    ).rejects.toMatchObject({ code: 'MANAGEMENT_REQUIRED' });
  } finally {
    await database.pool.query(
      "insert into user_roles(user_id,role) values($1,'HR')",
      [hr.user.id],
    );
  }
});
it('keeps own pending history visible after more than 500 foreign requests', async () => {
  const ownIds = (await service.list(own)).map((r) => r.id);
  expect(ownIds.length).toBeGreaterThan(0);
  await database.pool.query(
    `insert into leave_requests(kind,status,employee_id,department_id,reason,from_date,to_date,head_mode,created_at,created_by)
 select 'PERMISSION','PENDING_HEAD',$1,$2,'Ajena','2031-01-01','2031-01-01','DEPARTMENT', $4::timestamptz + n * interval '1 second',$3 from generate_series(1,501) n`,
    [foreign.employeeId, departmentId, foreign.user.id, now.toISOString()],
  );
  const listed = await service.list(own);
  expect(ownIds.every((id) => listed.some((r) => r.id === id))).toBe(true);
  expect(listed.every((r) => r.employeeId === own.employeeId)).toBe(true);
});
it('links approvers and HR notifications to their scoped approval inbox', async () => {
  const r = await service.create(
    {
      kind: 'VACATION',
      fromDate: '2030-04-01',
      toDate: '2030-04-01',
      vacationPeriodYear: 1,
      reason: 'Destino del aviso',
      idempotencyKey: key(),
    },
    own,
  );
  const notice = await database.pool.query(
    `select o.recipient_id,o.href from notification_outbox o join audit_events a on a.id=o.event_id where a.entity_id=$1 and a.action='leave.request.created'`,
    [r.id],
  );
  expect(notice.rows).toContainEqual({
    recipient_id: own.user.id,
    href: '/solicitudes',
  });
  expect(notice.rows).toContainEqual({
    recipient_id: head.user.id,
    href: '/aprobaciones',
  });
  expect(notice.rows).toContainEqual({
    recipient_id: hr.user.id,
    href: '/aprobaciones',
  });
  await service.withdraw(
    r.id,
    { reason: 'Fin prueba', idempotencyKey: key() },
    own,
  );
});
it('prevents concurrent reservations from overcommitting the same period and rejects changed UUID content', async () => {
  const base = {
    kind: 'VACATION' as const,
    vacationPeriodYear: 1,
    reason: 'Reserva concurrente',
    idempotencyKey: key(),
  };
  const first = { ...base, fromDate: '2030-05-06', toDate: '2030-05-15' };
  const second = {
    ...base,
    idempotencyKey: key(),
    fromDate: '2030-06-03',
    toDate: '2030-06-12',
  };
  const results = await Promise.allSettled([
    service.create(first, own),
    service.create(second, own),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const good = results.find((r) => r.status === 'fulfilled')!;
  if (good.status !== 'fulfilled') throw Error('Missing result');
  expect((await service.balances(own))[0]!.available).toBe(4);
  const original = good.value.fromDate === first.fromDate ? first : second;
  await expect(
    service.create({ ...original, reason: 'Contenido cambiado' }, own),
  ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  await service.withdraw(
    good.value.id,
    { reason: 'Limpieza reserva', idempotencyKey: key() },
    own,
  );
  expect((await service.balances(own))[0]!.available).toBe(12);
});
it('rejection releases a reservation once and preserves its decision reason', async () => {
  const r = await service.create(
    {
      kind: 'VACATION',
      fromDate: '2030-06-17',
      toDate: '2030-06-17',
      vacationPeriodYear: 1,
      reason: 'Solicitud a rechazar',
      idempotencyKey: key(),
    },
    own,
  );
  const payload = {
    decision: 'REJECT' as const,
    reason: 'No hay cobertura operativa',
    idempotencyKey: key(),
  };
  const a = await service.decide(r.id, payload, head);
  expect(a.status).toBe('REJECTED');
  expect(a.decisions[0]!.reason).toBe(payload.reason);
  expect(await service.decide(r.id, payload, head)).toEqual(a);
  await expect(
    service.decide(r.id, { ...payload, idempotencyKey: key() }, head),
  ).rejects.toMatchObject({ code: 'REQUEST_RESOLVED' });
  expect((await service.balances(own))[0]!.available).toBe(12);
});
it('rejects a head revoked after the actor scope was resolved', async () => {
  const r = await service.create(
    {
      kind: 'VACATION',
      fromDate: '2030-06-18',
      toDate: '2030-06-18',
      vacationPeriodYear: 1,
      reason: 'Cambio de jefatura',
      idempotencyKey: key(),
    },
    own,
  );
  await database.pool.query(
    "update organization_assignments set revoked_at=$2 where employee_id=$1 and kind='HEAD'",
    [head.employeeId, now.toISOString()],
  );
  try {
    await expect(
      service.decide(
        r.id,
        {
          decision: 'APPROVE',
          reason: 'Alcance antiguo',
          idempotencyKey: key(),
        },
        head,
      ),
    ).rejects.toMatchObject({ code: 'APPROVER_REQUIRED' });
  } finally {
    await database.pool.query(
      "update organization_assignments set revoked_at=null where employee_id=$1 and kind='HEAD'",
      [head.employeeId],
    );
  }
  await service.withdraw(
    r.id,
    { reason: 'Retiro tras cambio', idempotencyKey: key() },
    own,
  );
});
it('validates substitutes against their live source assignment and records their authority', async () => {
  const substitute = await account('Suplente');
  substitute.managedDepartmentIds = [departmentId];
  const source = (
    await database.pool.query(
      "select id from organization_assignments where kind='HEAD' and employee_id=$1",
      [head.employeeId],
    )
  ).rows[0].id;
  const [assignment] = await database.db
    .insert(assignments)
    .values({
      kind: 'SUBSTITUTE',
      employeeId: substitute.employeeId!,
      departmentId,
      sourceAssignmentId: source,
      startsAt: new Date('2030-01-01'),
      endsAt: new Date('2030-01-11'),
      reason: 'Suplencia explícita',
      createdBy: hr.user.id,
    })
    .returning();
  const r = await service.create(
    {
      kind: 'VACATION',
      fromDate: '2030-06-19',
      toDate: '2030-06-19',
      vacationPeriodYear: 1,
      reason: 'Suplencia',
      idempotencyKey: key(),
    },
    own,
  );
  await database.pool.query(
    'update organization_assignments set revoked_at=$2 where id=$1',
    [source, now.toISOString()],
  );
  try {
    await expect(
      service.decide(
        r.id,
        {
          decision: 'APPROVE',
          reason: 'Fuente revocada',
          idempotencyKey: key(),
        },
        substitute,
      ),
    ).rejects.toMatchObject({ code: 'APPROVER_REQUIRED' });
  } finally {
    await database.pool.query(
      'update organization_assignments set revoked_at=null where id=$1',
      [source],
    );
  }
  const approved = await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Suplente vigente', idempotencyKey: key() },
    substitute,
  );
  expect(approved.decisions[0]!.assignmentId).toBe(assignment!.id);
  await service.withdraw(
    r.id,
    { reason: 'Fin prueba suplencia', idempotencyKey: key() },
    own,
  );
  await database.pool.query(
    'update organization_assignments set revoked_at=$2 where id=$1',
    [assignment!.id, now.toISOString()],
  );
});
it('blocks the same person from signing the head and director steps even after reassignment', async () => {
  const r = await service.create(
    {
      kind: 'VACATION',
      fromDate: '2030-06-20',
      toDate: '2030-06-20',
      vacationPeriodYear: 1,
      reason: 'Dos personas distintas',
      idempotencyKey: key(),
    },
    own,
  );
  await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Primera firma', idempotencyKey: key() },
    head,
  );
  await database.pool.query(
    "update organization_assignments set revoked_at=$2 where employee_id=$1 and kind='DIRECTOR'",
    [director.employeeId, now.toISOString()],
  );
  const [replacement] = await database.db
    .insert(assignments)
    .values({
      kind: 'DIRECTOR',
      employeeId: head.employeeId!,
      departmentId: null,
      startsAt: new Date('2030-01-01'),
      reason: 'Reasignación de prueba',
      createdBy: hr.user.id,
    })
    .returning();
  try {
    await expect(
      service.decide(
        r.id,
        {
          decision: 'APPROVE',
          reason: 'Segunda firma propia',
          idempotencyKey: key(),
        },
        head,
      ),
    ).rejects.toMatchObject({ code: 'DISTINCT_APPROVER_REQUIRED' });
  } finally {
    await database.pool.query(
      'delete from organization_assignments where id=$1',
      [replacement!.id],
    );
    await database.pool.query(
      "update organization_assignments set revoked_at=null where employee_id=$1 and kind='DIRECTOR'",
      [director.employeeId],
    );
  }
  await service.withdraw(
    r.id,
    { reason: 'Fin prueba firmas', idempotencyKey: key() },
    own,
  );
});
it('routes a heads own request only to its explicit live superior and revalidates that relationship', async () => {
  const type = await service.savePermissionType(
    undefined,
    {
      name: 'Permiso superior',
      paid: false,
      evidenceRequired: false,
      allowPartial: false,
      active: true,
      idempotencyKey: key(),
    },
    hr,
  );
  const payload = {
    kind: 'PERMISSION' as const,
    permissionTypeId: type.id,
    fromDate: '2030-06-21',
    toDate: '2030-06-21',
    reason: 'Solicitud de jefe',
    idempotencyKey: key(),
  };
  await expect(service.create(payload, head)).rejects.toMatchObject({
    code: 'APPROVAL_CHAIN_REQUIRED',
  });
  await database.pool.query(
    'update employees set supervisor_id=$2 where id=$1',
    [head.employeeId, foreign.employeeId],
  );
  const r = await service.create(payload, head);
  await database.pool.query(
    'update employees set supervisor_id=$2 where id=$1',
    [head.employeeId, hr.employeeId],
  );
  await expect(
    service.decide(
      r.id,
      {
        decision: 'APPROVE',
        reason: 'Superior anterior',
        idempotencyKey: key(),
      },
      foreign,
    ),
  ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
  await database.pool.query(
    'update employees set supervisor_id=$2 where id=$1',
    [head.employeeId, foreign.employeeId],
  );
  const decision = await service.decide(
    r.id,
    {
      decision: 'APPROVE',
      reason: 'Superior explícito',
      idempotencyKey: key(),
    },
    foreign,
  );
  expect(decision.status).toBe('PENDING_DIRECTOR');
  const authority = (
    await database.pool.query(
      'select authority_snapshot from request_decisions where request_id=$1',
      [r.id],
    )
  ).rows[0].authority_snapshot;
  expect(authority).toMatchObject({
    mode: 'SUPERVISOR',
    supervisorId: foreign.employeeId,
  });
  await service.withdraw(
    r.id,
    { reason: 'Fin prueba superior', idempotencyKey: key() },
    head,
  );
  await database.pool.query(
    'update employees set supervisor_id=null where id=$1',
    [head.employeeId],
  );
});
it('rechecks cancellation timing at director signoff and never refunds days already started', async () => {
  const r = await service.create(
    {
      kind: 'VACATION',
      fromDate: '2030-07-01',
      toDate: '2030-07-01',
      vacationPeriodYear: 1,
      reason: 'Ya comenzó al resolver',
      idempotencyKey: key(),
    },
    own,
  );
  await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Jefe', idempotencyKey: key() },
    head,
  );
  await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Dirección', idempotencyKey: key() },
    director,
  );
  const c = await service.create(
    {
      kind: 'CANCELLATION',
      originalRequestId: r.id,
      reason: 'Cancelación pendiente',
      idempotencyKey: key(),
    },
    own,
  );
  await service.decide(
    c.id,
    { decision: 'APPROVE', reason: 'Jefe acepta', idempotencyKey: key() },
    head,
  );
  const late = createRequestService(database.db, {
    clock: () => new Date('2030-07-01T14:00:00Z'),
  });
  await expect(
    late.decide(
      c.id,
      { decision: 'APPROVE', reason: 'Demasiado tarde', idempotencyKey: key() },
      director,
    ),
  ).rejects.toMatchObject({ code: 'CANCELLATION_STARTED' });
  expect(
    (
      await database.pool.query(
        'select status from leave_requests where id=$1',
        [r.id],
      )
    ).rows[0].status,
  ).toBe('APPROVED');
  expect(
    (
      await database.pool.query(
        'select count(*)::int as count from request_decisions where request_id=$1',
        [c.id],
      )
    ).rows[0].count,
  ).toBe(1);
  expect((await service.balances(own))[0]!.balance).toBe(11);
  await service.withdraw(
    c.id,
    { reason: 'Cancelar intento vencido', idempotencyKey: key() },
    own,
  );
});
it('rolls back the request, evidence and reserved balance if the transactional audit fails', async () => {
  const before = (await service.balances(own))[0]!;
  const count = (
    await database.pool.query(
      'select count(*)::int as count from leave_requests',
    )
  ).rows[0].count;
  await database.pool.query(
    "create function fail_request_audit() returns trigger language plpgsql as $$ begin if NEW.action='leave.request.created' then raise exception 'forced'; end if; return NEW; end; $$",
  );
  await database.pool.query(
    'create trigger request_audit_failure before insert on audit_events for each row execute function fail_request_audit()',
  );
  try {
    await expect(
      service.create(
        {
          kind: 'VACATION',
          fromDate: '2030-08-01',
          toDate: '2030-08-01',
          vacationPeriodYear: 1,
          reason: 'Transacción',
          evidence: [
            {
              filename: 'privado.pdf',
              mimeType: 'application/pdf',
              contentBase64:
                Buffer.from('%PDF-1.7\nprivado').toString('base64'),
            },
          ],
          idempotencyKey: key(),
        },
        own,
      ),
    ).rejects.toThrow();
  } finally {
    await database.pool.query(
      'drop trigger request_audit_failure on audit_events',
    );
    await database.pool.query('drop function fail_request_audit()');
  }
  expect((await service.balances(own))[0]!.available).toBe(before.available);
  expect(
    (
      await database.pool.query(
        'select count(*)::int as count from leave_requests',
      )
    ).rows[0].count,
  ).toBe(count);
  expect(
    (
      await database.pool.query(
        "select id from request_evidence where filename='privado.pdf'",
      )
    ).rows,
  ).toEqual([]);
});
it('enforces HTTP authentication, CSRF and management scope on the new routes', async () => {
  const app = buildApp(
    parseConfig({
      DATABASE_URL: url.toString(),
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    }),
  );
  try {
    for (const path of [
      '/api/requests',
      '/api/leave/configuration',
      '/api/vacation/balances',
    ])
      expect((await app.inject(path)).statusCode).toBe(401);
    const owner = await login(app, own.user.email);
    const manager = await login(app, hr.user.email);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/api/leave/policy',
          headers: owner.headers,
          payload: { ...policy, idempotencyKey: key() },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/api/leave/policy',
          headers: { cookie: manager.cookie },
          payload: { ...policy, idempotencyKey: key() },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/requests',
          headers: owner.headers,
          payload: {
            kind: 'VACATION',
            employeeId: foreign.employeeId,
            fromDate: '2030-09-01',
            toDate: '2030-09-01',
            vacationPeriodYear: 1,
            reason: 'Suplantación',
            idempotencyKey: key(),
          },
        })
      ).statusCode,
    ).toBe(400);
    const ownRequest = (
      await database.pool.query(
        'select id from leave_requests where employee_id=$1 limit 1',
        [own.employeeId],
      )
    ).rows[0].id;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/requests/${ownRequest}/decision`,
          headers: { cookie: owner.cookie },
          payload: {
            decision: 'APPROVE',
            reason: 'Sin CSRF',
            idempotencyKey: key(),
          },
        })
      ).statusCode,
    ).toBe(403);
  } finally {
    await app.close();
  }
});
it('accepts up to three private one MiB files through HTTP and protects downloads and audit snapshots', async () => {
  await database.pool.query(
    "update organization_assignments set starts_at='2020-01-01T00:00:00Z' where kind in ('HEAD','DIRECTOR')",
  );
  const app = buildApp(
    parseConfig({
      DATABASE_URL: url.toString(),
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    }),
  );
  try {
    const owner = await login(app, own.user.email),
      other = await login(app, foreign.user.email);
    const permission = (
      await database.pool.query(
        "select id from permission_types where name='Permiso con goce'",
      )
    ).rows[0].id;
    const bytes = Buffer.alloc(1048576, 32);
    Buffer.from('%PDF-1.7\nContenido privado').copy(bytes);
    const evidence = [1, 2, 3].map((n) => ({
      filename: `constancia ${n}.pdf`,
      mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64'),
    }));
    const result = await app.inject({
      method: 'POST',
      url: '/api/requests',
      headers: owner.headers,
      payload: {
        kind: 'PERMISSION',
        permissionTypeId: permission,
        fromDate: '2030-09-02',
        toDate: '2030-09-02',
        reason: 'Motivo médico privado que no debe aparecer en auditoría',
        evidence,
        idempotencyKey: key(),
      },
    });
    expect(result.statusCode).toBe(200);
    const r = result.json();
    expect(r.evidence).toHaveLength(3);
    const path = `/api/requests/${r.id}/evidence/${r.evidence[0].id}`;
    expect((await app.inject(path)).statusCode).toBe(401);
    expect(
      (await app.inject({ url: path, headers: other.headers })).statusCode,
    ).toBe(404);
    const file = await app.inject({ url: path, headers: owner.headers });
    expect(file.statusCode).toBe(200);
    expect(file.rawPayload).toEqual(bytes);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(file.headers['cache-control']).toBe('no-store');
    expect(file.headers['content-disposition']).toContain('attachment;');
    const replay = await app.inject({
      method: 'POST',
      url: '/api/requests',
      headers: owner.headers,
      payload: {
        kind: 'PERMISSION',
        permissionTypeId: permission,
        fromDate: '2030-09-03',
        toDate: '2030-09-03',
        reason: 'Nombre inseguro',
        evidence: [{ ...evidence[0], filename: '../escape.pdf' }],
        idempotencyKey: key(),
      },
    });
    expect(replay.statusCode).toBe(400);
    const snapshots = (
      await database.pool.query(
        'select before,after from audit_events where entity_id=$1',
        [r.id],
      )
    ).rows;
    expect(JSON.stringify(snapshots)).not.toContain('Motivo médico');
    expect(JSON.stringify(snapshots)).not.toContain('contentBase64');
    expect(JSON.stringify(snapshots)).not.toContain('constancia');
  } finally {
    await app.close();
  }
});
it('approves a real attendance justification once, unlocks pending marks and preserves original attempts and incidents', async () => {
  await database.pool.query(
    "update employees set category='OPERATIONAL' where id=$1",
    [own.employeeId],
  );
  const template = (
    await database.pool.query(
      `insert into shift_templates(name,category,modality,start_time,end_time,weekdays,time_zone) values('Turno justificación','OPERATIONAL','HOME_OFFICE','07:49','16:00','[1,2,3,4,5]','America/Merida') returning id`,
    )
  ).rows[0].id;
  const slot = (
    await database.pool.query(
      `insert into schedule_assignments(employee_id,template_id,work_date,kind,template_version,starts_at,ends_at,modality,time_zone,template_name,snapshot,status,published_at) values($1,$2,'2030-01-10','REGULAR',1,'2030-01-10T13:49:00Z','2030-01-10T22:00:00Z','HOME_OFFICE','America/Merida','Turno justificación','{}','PUBLISHED','2030-01-01T00:00:00Z') returning id`,
      [own.employeeId, template],
    )
  ).rows[0].id;
  const attendance = createAttendanceService(database.db, { clock: () => now });
  const attempt = await attendance.punch(
    { assignmentId: slot, direction: 'ENTRY', idempotencyKey: key() },
    own,
  );
  expect(attempt.attempt.accepted).toBe(true);
  expect(attempt.incidents[0]!.kind).toBe('LATE_ENTRY');
  expect(attempt.requiresReason).toBe(true);
  const incidentId = attempt.incidents[0]!.id;
  const originalAttempt = (
    await database.pool.query('select * from attendance_attempts where id=$1', [
      attempt.attempt.id,
    ])
  ).rows;
  const originalIncident = (
    await database.pool.query(
      'select * from attendance_incidents where id=$1',
      [incidentId],
    )
  ).rows;
  expect(
    (await attendance.me(own)).pendingIncidents.some(
      (i) => i.id === incidentId,
    ),
  ).toBe(true);
  const input = {
    kind: 'JUSTIFICATION' as const,
    incidentId,
    reason: 'Atención médica documentada',
    evidence: [
      {
        filename: 'atencion.pdf',
        mimeType: 'application/pdf' as const,
        contentBase64: Buffer.from('%PDF-1.7\nConstancia privada').toString(
          'base64',
        ),
      },
    ],
    idempotencyKey: key(),
  };
  const r = await service.create(input, own);
  expect(r.evidence).toHaveLength(1);
  await expect(
    service.create({ ...input, idempotencyKey: key() }, own),
  ).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
  await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Jefe valida', idempotencyKey: key() },
    head,
  );
  expect(await getIncidentResolution(database.db, incidentId)).toBeNull();
  expect(
    (await attendance.me(own)).pendingIncidents.some(
      (i) => i.id === incidentId,
    ),
  ).toBe(true);
  await service.decide(
    r.id,
    { decision: 'APPROVE', reason: 'Director confirma', idempotencyKey: key() },
    director,
  );
  expect(await getIncidentResolution(database.db, incidentId)).toEqual({
    requestId: r.id,
    decidedAt: now.toISOString(),
  });
  expect(
    (await attendance.me(own)).pendingIncidents.some(
      (i) => i.id === incidentId,
    ),
  ).toBe(false);
  expect(
    (
      await database.pool.query(
        'select * from attendance_attempts where id=$1',
        [attempt.attempt.id],
      )
    ).rows,
  ).toEqual(originalAttempt);
  expect(
    (
      await database.pool.query(
        'select * from attendance_incidents where id=$1',
        [incidentId],
      )
    ).rows,
  ).toEqual(originalIncident);
  const exit = await attendance.punch(
    {
      assignmentId: slot,
      direction: 'EXIT',
      reason: 'Salida anticipada adicional registrada',
      idempotencyKey: key(),
    },
    own,
  );
  expect(exit.attempt.accepted).toBe(true);
  await expect(
    service.create({ ...input, idempotencyKey: key() }, own),
  ).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
  await database.pool.query(
    "update employees set category='ADMINISTRATIVE' where id=$1",
    [own.employeeId],
  );
});
