import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import type { SessionView } from '@asistencia/contracts';
import { createDatabase } from '../src/infrastructure/database/client.js';
import { runMigrations } from '../src/infrastructure/database/migrate.js';
import { createIdentityService } from '../src/modules/identity/index.js';
import {
  createRequestService,
  getIncidentResolution,
} from '../src/modules/requests/index.js';
import { createAttendanceService } from '../src/modules/attendance/index.js';
import { employees, assignments } from '../src/modules/employees/schema.js';
import { departments } from '../src/modules/departments/schema.js';
import { buildApp } from '../src/bootstrap/app.js';
import { parseConfig } from '../src/bootstrap/config.js';
import { login, TEST_PASSWORD } from './helpers/auth.js';
loadEnvFile('.env');
const source = process.env.TEST_DATABASE_URL;
if (!source || !new URL(source).pathname.endsWith('_test'))
  throw Error('Require _test');
const control = createDatabase(source),
  name = `head_final_${randomUUID().replaceAll('-', '')}_test`,
  url = new URL(source);
url.pathname = `/${name}`;
const database = createDatabase(url.toString());
let made = false,
  departmentId: string,
  headAssignmentId: string,
  permissionId: string;
let now = new Date('2030-01-10T14:00:00Z');
const clock = () => now,
  service = createRequestService(database.db, { clock });
let own: SessionView,
  head: SessionView,
  admin: SessionView,
  outsider: SessionView;
async function account(
  label: string,
  roles: ('ADMIN' | 'HR' | 'EMPLOYEE')[] = ['EMPLOYEE'],
): Promise<SessionView> {
  const user = await createIdentityService(database.db).createUser({
    email: `${label}@example.test`,
    name: label,
    password: TEST_PASSWORD,
    active: true,
    roles,
  });
  const [e] = await database.db
    .insert(employees)
    .values({
      employeeNumber: label,
      fullName: label,
      departmentId,
      position: 'Prueba',
      joinedOn: '2020-01-01',
      category: 'OPERATIONAL',
      userId: user.id,
    })
    .returning();
  return {
    user,
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
  };
}
beforeAll(async () => {
  await control.pool.query(`create database "${name}"`);
  made = true;
  await runMigrations(database.db);
  const [d] = await database.db
    .insert(departments)
    .values({ name: 'Jefatura definitiva' })
    .returning();
  departmentId = d!.id;
  own = await account('Persona');
  head = await account('Jefe');
  admin = await account('Admin', ['ADMIN']);
  outsider = await account('Ajeno');
  head.managedDepartmentIds = [departmentId];
  const [a] = await database.db
    .insert(assignments)
    .values({
      kind: 'HEAD',
      employeeId: head.employeeId!,
      departmentId,
      startsAt: new Date('2020-01-01'),
      reason: 'Prueba',
      createdBy: admin.user.id,
    })
    .returning();
  headAssignmentId = a!.id;
  await service.savePolicy(
    {
      name: 'Prueba explícita',
      entitlements: [{ fromYear: 1, days: 12 }],
      administrativeWeekdays: [1, 2, 3, 4, 5, 6, 7],
      operationalWeekdays: [1, 2, 3, 4, 5, 6, 7],
      excludeHolidays: false,
      idempotencyKey: randomUUID(),
    },
    admin,
  );
  permissionId = (
    await service.savePermissionType(
      undefined,
      {
        name: 'Permiso prueba',
        paid: true,
        evidenceRequired: false,
        allowPartial: true,
        active: true,
        idempotencyKey: randomUUID(),
      },
      admin,
    )
  ).id;
  await service.grant(
    {
      employeeId: own.employeeId!,
      anniversaryYear: 1,
      reason: 'Apertura aislada',
      idempotencyKey: randomUUID(),
    },
    admin,
  );
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
const decision = () => ({
  decision: 'APPROVE' as const,
  reason: 'Decisión final de jefatura',
  idempotencyKey: key(),
});
async function vacation(fromDate: string, toDate = fromDate) {
  return service.create(
    {
      kind: 'VACATION',
      fromDate,
      toDate,
      vacationPeriodYear: 1,
      reason: 'Solicitud propia',
      idempotencyKey: key(),
    },
    own,
  );
}
it('accepts a new request without director and applies final head approval exactly once concurrently', async () => {
  const r = await vacation('2030-02-01', '2030-02-02');
  expect(r).toMatchObject({
    status: 'PENDING_HEAD',
    approvalFlow: 'HEAD_ONLY',
    canDirectorDecide: false,
  });
  const before = (await service.balances(own))[0]!;
  expect(before.reserved).toBe(2);
  for (const scope of [own, admin, outsider])
    await expect(service.decide(r.id, decision(), scope)).rejects.toBeDefined();
  const input = decision();
  const [a, b] = await Promise.all([
    service.decide(r.id, input, head),
    service.decide(r.id, input, head),
  ]);
  expect(a).toEqual(b);
  expect(a).toMatchObject({
    status: 'APPROVED',
    resolvedAt: now.toISOString(),
    canDirectorDecide: false,
  });
  expect(a.decisions.map((d) => d.step)).toEqual(['HEAD']);
  const balance = (await service.balances(own))[0]!;
  expect(balance).toMatchObject({ reserved: 0, balance: 10, available: 10 });
  expect(
    (
      await database.pool.query(
        "select count(*)::int n from vacation_movements where request_id=$1 and kind='CONSUME'",
        [r.id],
      )
    ).rows[0].n,
  ).toBe(1);
  await expect(service.decide(r.id, decision(), head)).rejects.toMatchObject({
    code: 'REQUEST_RESOLVED',
  });
});
it('head rejection and withdrawal each release a vacation reservation', async () => {
  for (const [date, withdraw] of [
    ['2030-02-10', false],
    ['2030-02-11', true],
  ] as const) {
    const r = await vacation(date);
    const result = withdraw
      ? await service.withdraw(
          r.id,
          { reason: 'Retiro propio', idempotencyKey: key() },
          own,
        )
      : await service.decide(
          r.id,
          {
            decision: 'REJECT',
            reason: 'Rechazo de jefatura',
            idempotencyKey: key(),
          },
          head,
        );
    expect(result.status).toBe(withdraw ? 'WITHDRAWN' : 'REJECTED');
    expect((await service.balances(own))[0]!.reserved).toBe(0);
  }
});
it('head approval of a future cancellation refunds once without director', async () => {
  const original = await vacation('2030-03-01');
  await service.decide(original.id, decision(), head);
  const cancellation = await service.create(
    {
      kind: 'CANCELLATION',
      originalRequestId: original.id,
      reason: 'Cancelar futura',
      idempotencyKey: key(),
    },
    own,
  );
  const input = decision();
  const [a, b] = await Promise.all([
    service.decide(cancellation.id, input, head),
    service.decide(cancellation.id, input, head),
  ]);
  expect(a.status).toBe('APPROVED');
  expect(a).toEqual(b);
  expect(
    (await service.list(own)).find((r) => r.id === original.id)?.status,
  ).toBe('CANCELLED');
  expect(
    (
      await database.pool.query(
        "select count(*)::int n from vacation_movements where request_id=$1 and kind='REFUND'",
        [original.id],
      )
    ).rows[0].n,
  ).toBe(1);
});
it('does not report a missing director as a blocker for the current head-only flow', async () => {
  const issues = await service.configurationIssues();
  expect(issues.some((i) => i.code === 'DIRECTOR_REQUIRED')).toBe(false);
  expect(
    issues.find((i) => i.code === 'APPROVAL_CHAIN_REQUIRED')?.count ?? 0,
  ).toBe(0);
  // The head has no explicit supervisor and is correctly diagnosed separately.
  expect(issues.find((i) => i.code === 'HEAD_SUPERIOR_REQUIRED')?.count).toBe(
    1,
  );
});
it('uses an explicit superior for a head request without self approval or CEO signoff', async () => {
  await database.pool.query(
    'update employees set supervisor_id=$1 where id=$2',
    [outsider.employeeId, head.employeeId],
  );
  const r = await service.create(
    {
      kind: 'PERMISSION',
      permissionTypeId: permissionId,
      fromDate: '2030-06-01',
      toDate: '2030-06-01',
      reason: 'Solicitud de jefe',
      idempotencyKey: key(),
    },
    head,
  );
  await expect(service.decide(r.id, decision(), head)).rejects.toMatchObject({
    code: 'SELF_APPROVAL',
  });
  const result = await service.decide(r.id, decision(), outsider);
  expect(result.status).toBe('APPROVED');
  expect(result.decisions.map((d) => d.actorId)).toEqual([outsider.user.id]);
});
it('revalidates revoked head authority rather than trusting a previously resolved scope', async () => {
  const r = await service.create(
    {
      kind: 'PERMISSION',
      permissionTypeId: permissionId,
      fromDate: '2030-06-02',
      toDate: '2030-06-02',
      reason: 'Autoridad vigente',
      idempotencyKey: key(),
    },
    own,
  );
  await database.pool.query(
    'update organization_assignments set revoked_at=$1 where id=$2',
    [now, headAssignmentId],
  );
  try {
    await expect(service.decide(r.id, decision(), head)).rejects.toMatchObject({
      code: 'APPROVER_REQUIRED',
    });
  } finally {
    await database.pool.query(
      'update organization_assignments set revoked_at=null where id=$1',
      [headAssignmentId],
    );
  }
  expect((await service.list(own)).find((x) => x.id === r.id)?.status).toBe(
    'PENDING_HEAD',
  );
});
it('never refunds a cancellation that has started while waiting for the final head decision', async () => {
  const original = await vacation('2030-04-01');
  await service.decide(original.id, decision(), head);
  const r = await service.create(
    {
      kind: 'CANCELLATION',
      originalRequestId: original.id,
      reason: 'Cancelación pendiente',
      idempotencyKey: key(),
    },
    own,
  );
  const before = (await service.balances(own))[0]!.balance;
  now = new Date('2030-04-01T14:00:00Z');
  try {
    await expect(service.decide(r.id, decision(), head)).rejects.toMatchObject({
      code: 'CANCELLATION_STARTED',
    });
    expect((await service.balances(own))[0]!.balance).toBe(before);
  } finally {
    now = new Date('2030-01-10T14:00:00Z');
  }
  expect(
    (
      await database.pool.query(
        "select count(*)::int n from vacation_movements where request_id=$1 and kind='REFUND'",
        [original.id],
      )
    ).rows[0].n,
  ).toBe(0);
});
it.each([false, true])(
  'resolves a real late punch immediately on head approval while preserving original events (cutoff=%s)',
  async (cutoff) => {
    const template = (
      await database.pool.query(
        "insert into shift_templates(name,category,modality,start_time,end_time,weekdays,time_zone) values('Head final','OPERATIONAL','HOME_OFFICE','08:00','16:00','[1,2,3,4,5,6,7]','America/Merida') returning id",
      )
    ).rows[0].id;
    const slot = (
      await database.pool.query(
        "insert into schedule_assignments(employee_id,template_id,work_date,kind,template_version,starts_at,ends_at,modality,time_zone,template_name,snapshot,status,published_at) values($1,$2,'2030-01-10','REGULAR',1,'2030-01-10T14:00Z','2030-01-10T22:00Z','HOME_OFFICE','America/Merida','Head final','{}','PUBLISHED',now()) returning id",
        [own.employeeId, template],
      )
    ).rows[0].id;
    now = new Date('2030-01-10T14:12:00Z');
    try {
      if (cutoff) {
        await database.pool.query(
          'update schedule_assignments set snapshot=$2::jsonb where id=$1',
          [slot, JSON.stringify({ category: 'ADMINISTRATIVE' })],
        );
        const settings = {
          lateToleranceMinutes: 10,
          earlyEntryMinutes: 30,
          lateExitMinutes: 120,
          administrativeAbsenceMinutes: 30,
        };
        await createAttendanceService(database.db, { clock }).updatePolicy(
          settings,
          admin.user.id,
        );
        now = new Date('2030-01-10T14:30:00Z');
      }
      const punch = await createAttendanceService(database.db, { clock }).punch(
        { assignmentId: slot, direction: 'ENTRY', idempotencyKey: key() },
        own,
      );
      const incident = punch.incidents[0]!;
      expect(punch.attempt.accepted).toBe(true);
      expect(incident.kind).toBe(cutoff ? 'LATE_ABSENCE' : 'LATE_ENTRY');
      const attempts = (
        await database.pool.query(
          'select * from attendance_attempts where assignment_id=$1',
          [slot],
        )
      ).rows;
      const original = (
        await database.pool.query(
          'select * from attendance_incidents where id=$1',
          [incident.id],
        )
      ).rows;
      const request = await service.create(
        {
          kind: 'JUSTIFICATION',
          incidentId: incident.id,
          reason: 'Motivo privado',
          idempotencyKey: key(),
        },
        own,
      );
      expect((await service.decide(request.id, decision(), head)).status).toBe(
        'APPROVED',
      );
      expect(
        await getIncidentResolution(database.db, incident.id),
      ).toMatchObject({ requestId: request.id });
      expect(
        (
          await database.pool.query(
            'select * from attendance_attempts where assignment_id=$1',
            [slot],
          )
        ).rows,
      ).toEqual(attempts);
      expect(
        (
          await database.pool.query(
            'select * from attendance_incidents where id=$1',
            [incident.id],
          )
        ).rows,
      ).toEqual(original);
    } finally {
      now = new Date('2030-01-10T14:00:00Z');
    }
  },
);
it('retains the frozen two-step flow of a historical request without changing new defaults', async () => {
  const [a] = await database.db
    .insert(assignments)
    .values({
      kind: 'DIRECTOR',
      employeeId: outsider.employeeId!,
      startsAt: new Date('2020-01-01'),
      reason: 'Histórico aislado',
      createdBy: admin.user.id,
    })
    .returning();
  try {
    const legacy = createRequestService(database.db, {
      clock,
      approvalFlow: 'HEAD_DIRECTOR',
    });
    const r = await legacy.create(
      {
        kind: 'PERMISSION',
        permissionTypeId: permissionId,
        fromDate: '2030-07-01',
        toDate: '2030-07-01',
        reason: 'Flujo previo',
        idempotencyKey: key(),
      },
      own,
    );
    expect((await service.decide(r.id, decision(), head)).status).toBe(
      'PENDING_DIRECTOR',
    );
    const approved = await service.decide(r.id, decision(), {
      ...outsider,
      permissions: { ...outsider.permissions, viewAllEmployees: true },
    });
    expect(approved.status).toBe('APPROVED');
    expect(approved.decisions.map((d) => d.step)).toEqual(['HEAD', 'DIRECTOR']);
  } finally {
    await database.pool.query(
      'update organization_assignments set revoked_at=$1 where id=$2',
      [now, a!.id],
    );
  }
});
import { readFileSync } from 'node:fs';
it('backfills legacy rows without approving them and uses HEAD_ONLY only for newly inserted rows', async () => {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'create temporary table approval_flow_probe as select * from leave_requests with no data',
    );
    await client.query(
      'alter table approval_flow_probe drop column approval_flow',
    );
    await client.query(
      "insert into approval_flow_probe(id,status) values($1,'PENDING_HEAD'),($2,'PENDING_DIRECTOR'),($3,'APPROVED')",
      [key(), key(), key()],
    );
    const migration = readFileSync(
      new URL('../drizzle/0010_head_final_approval.sql', import.meta.url),
      'utf8',
    ).replaceAll('"leave_requests"', '"approval_flow_probe"');
    await client.query(migration);
    expect(
      (
        await client.query(
          'select approval_flow,status from approval_flow_probe order by status',
        )
      ).rows,
    ).toEqual([
      { approval_flow: 'HEAD_DIRECTOR', status: 'APPROVED' },
      { approval_flow: 'HEAD_DIRECTOR', status: 'PENDING_DIRECTOR' },
      { approval_flow: 'HEAD_DIRECTOR', status: 'PENDING_HEAD' },
    ]);
    const id = key();
    await client.query(
      "insert into approval_flow_probe(id,status) values($1,'PENDING_HEAD')",
      [id],
    );
    expect(
      (
        await client.query(
          'select approval_flow from approval_flow_probe where id=$1',
          [id],
        )
      ).rows[0].approval_flow,
    ).toBe('HEAD_ONLY');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
it('HTTP authenticates and checks CSRF, rejects client-selected flow, and finalizes through head alone', async () => {
  const app = buildApp(
    parseConfig({
      DATABASE_URL: url.toString(),
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    }),
  );
  try {
    const owner = await login(app, own.user.email),
      manager = await login(app, head.user.email),
      administrator = await login(app, admin.user.email);
    const payload = {
      kind: 'PERMISSION',
      permissionTypeId: permissionId,
      fromDate: '2031-01-03',
      toDate: '2031-01-03',
      reason: 'HTTP actual',
      idempotencyKey: key(),
    };
    expect(
      (await app.inject({ method: 'POST', url: '/api/requests', payload }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/requests',
          headers: owner.headers,
          payload: { ...payload, approvalFlow: 'HEAD_DIRECTOR' },
        })
      ).statusCode,
    ).toBe(400);
    const created = await app.inject({
      method: 'POST',
      url: '/api/requests',
      headers: owner.headers,
      payload,
    });
    expect(created.statusCode).toBe(200);
    const r = created.json();
    expect(r.approvalFlow).toBe('HEAD_ONLY');
    const path = `/api/requests/${r.id}/decision`;
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers: { cookie: manager.cookie },
          payload: decision(),
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers: administrator.headers,
          payload: decision(),
        })
      ).statusCode,
    ).toBe(403);
    const approved = await app.inject({
      method: 'POST',
      url: path,
      headers: manager.headers,
      payload: decision(),
    });
    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({
      status: 'APPROVED',
      canDirectorDecide: false,
    });
  } finally {
    await app.close();
  }
});
it('rejects an inactive explicit superior before creating a head request', async () => {
  await database.pool.query('update users set active=false where id=$1', [
    outsider.user.id,
  ]);
  try {
    await expect(
      service.create(
        {
          kind: 'PERMISSION',
          permissionTypeId: permissionId,
          fromDate: '2030-06-03',
          toDate: '2030-06-03',
          reason: 'Superior inactivo',
          idempotencyKey: key(),
        },
        head,
      ),
    ).rejects.toMatchObject({ code: 'APPROVAL_CHAIN_REQUIRED' });
  } finally {
    await database.pool.query('update users set active=true where id=$1', [
      outsider.user.id,
    ]);
  }
});
it('applies only one final effect when distinct operation keys race for the same request', async () => {
  const r = await vacation('2030-08-01');
  const results = await Promise.allSettled([
    service.decide(r.id, decision(), head),
    service.decide(r.id, decision(), head),
  ]);
  expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((x) => x.status === 'rejected')).toHaveLength(1);
  expect(
    (
      await database.pool.query(
        'select count(*)::int n from request_decisions where request_id=$1',
        [r.id],
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await database.pool.query(
        "select count(*)::int n from vacation_movements where request_id=$1 and kind='CONSUME'",
        [r.id],
      )
    ).rows[0].n,
  ).toBe(1);
});
