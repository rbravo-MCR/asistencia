import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type {
  ConfigurationIssue,
  CreateRequestInput,
  LeavePolicyInput,
  LeavePolicyView,
  LeaveRequestView,
  PermissionTypeInput,
  PermissionTypeView,
  RequestDecisionInput,
  RequestWithdrawInput,
  SessionView,
  VacationAdjustmentInput,
  VacationBalanceView,
  VacationGrantInput,
} from '@asistencia/contracts';
import type { Database } from '../../infrastructure/database/client.js';
import { employees, assignments } from '../employees/schema.js';
import { users, userRoles } from '../identity/schema.js';
import { holidays, scheduleAssignments } from '../planning/schema.js';
import { attendanceIncidents } from '../attendance/schema.js';
import { enqueueNotifications, recordAudit } from '../audit/index.js';
import {
  leavePolicies,
  leaveRequests,
  permissionTypes,
  requestDecisions,
  requestEvidence,
  requestOperations,
  vacationMovements,
} from './schema.js';
import {
  anniversaryDate,
  chargedDates,
  civil,
  cleanText,
  dateRange,
  entitlementDays,
  fail,
  meridaDate,
  requestFingerprint,
  validateEvidence,
} from './domain/leave.js';
type Executor = Pick<Database, 'select' | 'insert' | 'update' | 'execute'>;
type Row = typeof leaveRequests.$inferSelect;
type Employee = typeof employees.$inferSelect;
type Authority = {
  employeeId: string;
  userId: string;
  assignmentId: string | null;
  snapshot: Record<string, unknown>;
};
const zero = '00000000-0000-0000-0000-000000000000';
async function lock(tx: Executor) {
  await tx.execute(sql`select pg_advisory_xact_lock(81209002)`);
  await tx.execute(sql`select pg_advisory_xact_lock(81214001)`);
}
function policyView(p: typeof leavePolicies.$inferSelect): LeavePolicyView {
  return {
    id: p.id,
    version: p.version,
    name: p.name,
    entitlements: p.entitlements,
    administrativeWeekdays: p.administrativeWeekdays,
    operationalWeekdays: p.operationalWeekdays,
    excludeHolidays: p.excludeHolidays,
    createdAt: p.createdAt.toISOString(),
  };
}
function typeView(p: typeof permissionTypes.$inferSelect): PermissionTypeView {
  return { ...p };
}
function management(scope: SessionView) {
  if (!scope.permissions.manageOrganization)
    fail('MANAGEMENT_REQUIRED', 'Se requiere ADMIN o Recursos Humanos.', 403);
}
async function ownEmployee(tx: Executor, scope: SessionView) {
  const [e] = await tx
    .select()
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .where(
      and(
        eq(employees.id, scope.employeeId ?? zero),
        eq(employees.userId, scope.user.id),
        eq(employees.status, 'ACTIVE'),
        eq(users.active, true),
      ),
    );
  if (!e)
    fail(
      'OWN_EMPLOYEE_REQUIRED',
      'Tu cuenta requiere un empleado activo vinculado.',
      403,
    );
  return e.employees;
}
async function currentAuthorities(tx: Executor, now: Date) {
  const rows = await tx
    .select({ assignment: assignments, employee: employees, user: users })
    .from(assignments)
    .innerJoin(employees, eq(employees.id, assignments.employeeId))
    .innerJoin(users, eq(users.id, employees.userId))
    .where(
      and(
        isNull(assignments.revokedAt),
        eq(employees.status, 'ACTIVE'),
        eq(users.active, true),
      ),
    );
  return rows.filter(
    (r) =>
      r.assignment.startsAt <= now &&
      (!r.assignment.endsAt || r.assignment.endsAt > now),
  );
}
async function headAuthorities(
  tx: Executor,
  r: Pick<Row, 'employeeId' | 'departmentId' | 'headMode'>,
  now: Date,
): Promise<Authority[]> {
  if (r.headMode === 'SUPERVISOR') {
    const [requester] = await tx
      .select()
      .from(employees)
      .where(eq(employees.id, r.employeeId));
    if (!requester?.supervisorId) return [];
    const [supervisor] = await tx
      .select({ employee: employees, user: users })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(
        and(
          eq(employees.id, requester.supervisorId),
          eq(employees.status, 'ACTIVE'),
          eq(users.active, true),
        ),
      );
    return supervisor && supervisor.employee.id !== r.employeeId
      ? [
          {
            employeeId: supervisor.employee.id,
            userId: supervisor.user.id,
            assignmentId: null,
            snapshot: {
              mode: 'SUPERVISOR',
              requesterId: r.employeeId,
              supervisorId: supervisor.employee.id,
            },
          },
        ]
      : [];
  }
  const all = await currentAuthorities(tx, now);
  const heads = all.filter(
    (x) =>
      x.assignment.kind === 'HEAD' &&
      x.assignment.departmentId === r.departmentId &&
      x.employee.departmentId === r.departmentId,
  );
  return all
    .filter(
      (x) =>
        heads.includes(x) ||
        (x.assignment.kind === 'SUBSTITUTE' &&
          x.assignment.departmentId === r.departmentId &&
          heads.some(
            (h) => h.assignment.id === x.assignment.sourceAssignmentId,
          )),
    )
    .map((x) => ({
      employeeId: x.employee.id,
      userId: x.user.id,
      assignmentId: x.assignment.id,
      snapshot: {
        mode: x.assignment.kind,
        assignmentId: x.assignment.id,
        sourceAssignmentId: x.assignment.sourceAssignmentId,
        departmentId: r.departmentId,
      },
    }));
}
async function directorAuthorities(
  tx: Executor,
  now: Date,
): Promise<Authority[]> {
  return (await currentAuthorities(tx, now))
    .filter((x) => x.assignment.kind === 'DIRECTOR')
    .map((x) => ({
      employeeId: x.employee.id,
      userId: x.user.id,
      assignmentId: x.assignment.id,
      snapshot: { mode: 'DIRECTOR', assignmentId: x.assignment.id },
    }));
}
async function validChain(
  tx: Executor,
  r: Pick<Row, 'employeeId' | 'departmentId' | 'headMode'> &
    Partial<Pick<Row, 'approvalFlow'>>,
  now: Date,
) {
  const heads = (await headAuthorities(tx, r, now)).filter(
    (x) => x.employeeId !== r.employeeId,
  );
  const legacy = r.approvalFlow === 'HEAD_DIRECTOR';
  const directors = legacy
    ? (await directorAuthorities(tx, now)).filter(
        (x) => x.employeeId !== r.employeeId,
      )
    : [];
  if (
    !heads.length ||
    (legacy && !heads.some((h) => directors.some((d) => d.userId !== h.userId)))
  )
    fail(
      'APPROVAL_CHAIN_REQUIRED',
      legacy
        ? 'Configura jefatura/superior y dirección activos y distintos del solicitante y entre sí.'
        : 'Configura jefatura o superior explícito activo y distinto del solicitante.',
      409,
    );
  return { heads, directors };
}
async function latestPolicy(tx: Executor) {
  const [p] = await tx
    .select()
    .from(leavePolicies)
    .orderBy(desc(leavePolicies.version))
    .limit(1);
  if (!p)
    fail(
      'POLICY_REQUIRED',
      'Recursos Humanos debe configurar primero la política de vacaciones.',
      409,
    );
  return p;
}
async function bank(tx: Executor, employeeId: string, anniversaryYear: number) {
  const rows = await tx
    .select()
    .from(vacationMovements)
    .where(
      and(
        eq(vacationMovements.employeeId, employeeId),
        eq(vacationMovements.anniversaryYear, anniversaryYear),
      ),
    );
  return {
    rows,
    balance: rows.reduce((s, r) => s + r.balanceDelta, 0),
    reserved: rows.reduce((s, r) => s + r.reservedDelta, 0),
  };
}
async function move(
  tx: Executor,
  input: typeof vacationMovements.$inferInsert,
) {
  await tx.insert(vacationMovements).values(input);
}
function future(r: Pick<Row, 'fromDate' | 'partialStartsAt'>, now: Date) {
  return r.partialStartsAt
    ? r.partialStartsAt > now
    : r.fromDate > meridaDate(now);
}
export function createRequestService(
  db: Database,
  options: {
    clock?: () => Date;
    approvalFlow?: 'HEAD_ONLY' | 'HEAD_DIRECTOR';
  } = {},
) {
  const clock = options.clock ?? (() => new Date());
  // Trusted server policy; clients cannot choose their approval flow.
  const creationFlow = options.approvalFlow ?? 'HEAD_ONLY';
  async function run<T>(
    operation: string,
    input: { idempotencyKey: string },
    scope: SessionView,
    fn: (tx: Executor, now: Date) => Promise<T>,
  ): Promise<T> {
    return db.transaction(async (tx) => {
      await lock(tx);
      if (
        operation === 'policy' ||
        operation.startsWith('permission-type:') ||
        operation.startsWith('vacation.')
      ) {
        const [authority] = await tx
          .select({ id: users.id })
          .from(users)
          .innerJoin(userRoles, eq(userRoles.userId, users.id))
          .where(
            and(
              eq(users.id, scope.user.id),
              eq(users.active, true),
              inArray(userRoles.role, ['SUPER_ADMIN', 'ADMIN', 'HR']),
            ),
          )
          .limit(1);
        if (!authority)
          fail(
            'MANAGEMENT_REQUIRED',
            'Tu cuenta ya no tiene autorización vigente de ADMIN o Recursos Humanos.',
            403,
          );
      }
      const fingerprint = requestFingerprint({ operation, input });
      const [old] = await tx
        .select()
        .from(requestOperations)
        .where(eq(requestOperations.idempotencyKey, input.idempotencyKey));
      if (old) {
        if (
          old.actorId !== scope.user.id ||
          old.operation !== operation ||
          old.fingerprint !== fingerprint
        )
          fail(
            'IDEMPOTENCY_CONFLICT',
            'El identificador ya se utilizó con otro contenido o actor.',
            409,
          );
        return old.response as T;
      }
      const result = await fn(tx, clock());
      await tx.insert(requestOperations).values({
        idempotencyKey: input.idempotencyKey,
        actorId: scope.user.id,
        operation,
        fingerprint,
        response: result as object,
      });
      return result;
    });
  }
  async function canView(tx: Executor, r: Row, scope: SessionView, now: Date) {
    return (
      scope.permissions.viewAllEmployees ||
      r.createdBy === scope.user.id ||
      scope.managedDepartmentIds.includes(r.departmentId) ||
      (await headAuthorities(tx, r, now)).some(
        (h) => h.userId === scope.user.id,
      )
    );
  }
  async function view(
    tx: Executor,
    r: Row,
    scope: SessionView,
    now: Date,
  ): Promise<LeaveRequestView> {
    const [e] = await tx
      .select({ fullName: employees.fullName })
      .from(employees)
      .where(eq(employees.id, r.employeeId));
    const decisions = await tx
      .select()
      .from(requestDecisions)
      .where(eq(requestDecisions.requestId, r.id))
      .orderBy(
        asc(requestDecisions.createdAt),
        desc(requestDecisions.step),
        asc(requestDecisions.id),
      );
    const evidence = await tx
      .select({
        id: requestEvidence.id,
        filename: requestEvidence.filename,
        mimeType: requestEvidence.mimeType,
        sizeBytes: requestEvidence.sizeBytes,
      })
      .from(requestEvidence)
      .where(eq(requestEvidence.requestId, r.id));
    const self =
      r.employeeId === scope.employeeId || r.createdBy === scope.user.id;
    const eligible =
      !self && !decisions.some((d) => d.actorId === scope.user.id);
    return {
      id: r.id,
      kind: r.kind,
      status: r.status,
      approvalFlow: r.approvalFlow,
      employeeId: r.employeeId,
      employeeName: e?.fullName ?? 'Empleado',
      departmentId: r.departmentId,
      reason: r.reason,
      fromDate: r.fromDate,
      toDate: r.toDate,
      partialStartsAt: r.partialStartsAt?.toISOString() ?? null,
      partialEndsAt: r.partialEndsAt?.toISOString() ?? null,
      vacationPeriodYear: r.vacationPeriodYear,
      days: r.days,
      chargedDates: r.chargedDates,
      permissionTypeId: r.permissionTypeId,
      permissionTypeName: r.permissionSnapshot?.name ?? null,
      paid: r.permissionSnapshot?.paid ?? null,
      incidentId: r.incidentId,
      originalRequestId: r.originalRequestId,
      policyVersion: r.policySnapshot?.version ?? null,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      withdrawal: r.withdrawal,
      decisions: decisions.map((d) => ({
        id: d.id,
        step: d.step,
        decision: d.decision,
        reason: d.reason,
        actorId: d.actorId,
        actorName: d.actorName,
        assignmentId: d.assignmentId,
        createdAt: d.createdAt.toISOString(),
      })),
      evidence,
      canHeadDecide:
        r.status === 'PENDING_HEAD' &&
        eligible &&
        (await headAuthorities(tx, r, now)).some(
          (h) => h.userId === scope.user.id,
        ),
      canDirectorDecide:
        r.approvalFlow === 'HEAD_DIRECTOR' &&
        r.status === 'PENDING_DIRECTOR' &&
        eligible &&
        (await directorAuthorities(tx, now)).some(
          (d) => d.userId === scope.user.id,
        ),
      canWithdraw:
        self && ['PENDING_HEAD', 'PENDING_DIRECTOR'].includes(r.status),
      canCancel:
        self &&
        r.status === 'APPROVED' &&
        ['VACATION', 'PERMISSION'].includes(r.kind) &&
        future(r, now),
    };
  }
  async function find(tx: Executor, id: string, scope: SessionView, now: Date) {
    const [r] = await tx
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id));
    if (!r || !(await canView(tx, r, scope, now)))
      fail('REQUEST_NOT_FOUND', 'Solicitud no encontrada.', 404);
    return r;
  }
  async function notify(
    tx: Executor,
    r: Row,
    action: string,
    scope: SessionView,
    now: Date,
  ) {
    const eventId = await recordAudit(tx, {
      action,
      entityType: 'leave_request',
      entityId: r.id,
      actorId: scope.user.id,
      after: {
        employeeId: r.employeeId,
        departmentId: r.departmentId,
        kind: r.kind,
        status: r.status,
        approvalFlow: r.approvalFlow,
        days: r.days,
        policyVersion: r.policySnapshot?.version ?? null,
      },
    });
    const hr = await tx
      .select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .where(
        and(
          eq(users.active, true),
          inArray(userRoles.role, ['SUPER_ADMIN', 'HR', 'ADMIN']),
        ),
      );
    const recipients = [r.createdBy, ...hr.map((x) => x.id)];
    if (r.status === 'PENDING_HEAD')
      recipients.push(
        ...(await headAuthorities(tx, r, now)).map((x) => x.userId),
      );
    if (r.status === 'PENDING_DIRECTOR')
      recipients.push(
        ...(await directorAuthorities(tx, now)).map((x) => x.userId),
      );
    await enqueueNotifications(tx, {
      eventId,
      recipientIds: [r.createdBy],
      title: 'Solicitud de personal actualizada',
      message:
        'Hay una solicitud o resolución para consultar dentro del sistema.',
      href: '/solicitudes',
    });
    await enqueueNotifications(tx, {
      eventId,
      recipientIds: recipients.filter((id) => id !== r.createdBy),
      title: 'Solicitud de personal actualizada',
      message:
        'Hay una solicitud o resolución para consultar dentro del sistema.',
      href: '/aprobaciones',
    });
  }
  async function release(
    tx: Executor,
    r: Row,
    actorId: string,
    now: Date,
    kind: string,
  ) {
    if (r.kind === 'VACATION')
      await move(tx, {
        employeeId: r.employeeId,
        anniversaryYear: r.vacationPeriodYear!,
        kind,
        balanceDelta: 0,
        reservedDelta: -r.days,
        reason: 'Liberación de reserva por resolución de solicitud',
        requestId: r.id,
        dedupeKey: `release:${r.id}`,
        createdAt: now,
        createdBy: actorId,
      });
  }
  async function balanceView(
    tx: Executor,
    employee: Employee,
    year: number,
    now: Date,
  ): Promise<VacationBalanceView> {
    const b = await bank(tx, employee.id, year);
    const approved = await tx
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employee.id),
          eq(leaveRequests.kind, 'VACATION'),
          eq(leaveRequests.status, 'APPROVED'),
          eq(leaveRequests.vacationPeriodYear, year),
        ),
      );
    const today = meridaDate(now);
    return {
      employeeId: employee.id,
      employeeName: employee.fullName,
      anniversaryYear: year,
      entitlement: b.rows
        .filter((r) => r.kind === 'GRANT')
        .reduce((s, r) => s + r.balanceDelta, 0),
      balance: b.balance,
      reserved: b.reserved,
      available: b.balance - b.reserved,
      approvedDays: approved.reduce((s, r) => s + r.days, 0),
      enjoyedDays: approved
        .flatMap((r) => r.chargedDates)
        .filter((d) => d < today).length,
      movements: b.rows
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((r) => ({
          id: r.id,
          employeeId: r.employeeId,
          anniversaryYear: r.anniversaryYear,
          kind: r.kind,
          balanceDelta: r.balanceDelta,
          reservedDelta: r.reservedDelta,
          reason: r.reason,
          requestId: r.requestId,
          createdAt: r.createdAt.toISOString(),
        })),
    };
  }
  return {
    async configurationIssues(): Promise<ConfigurationIssue[]> {
      const now = clock();
      const staff = await db
        .select({ employee: employees, account: users })
        .from(employees)
        .leftJoin(users, eq(users.id, employees.userId))
        .where(eq(employees.status, 'ACTIVE'));
      const authorities = await currentAuthorities(db, now);
      const heads = authorities.filter(
        (a) =>
          a.assignment.kind === 'HEAD' &&
          a.employee.departmentId === a.assignment.departmentId,
      );
      const issues: ConfigurationIssue[] = [];
      const add = (
        code: string,
        title: string,
        count: number,
        href: string,
        detail: string,
        severity: 'WARNING' | 'INFO' = 'WARNING',
      ) => {
        if (count) issues.push({ code, title, count, href, detail, severity });
      };
      add(
        'HEAD_REQUIRED',
        'Departamentos sin jefatura válida',
        new Set(
          staff
            .filter(
              (s) =>
                !heads.some(
                  (h) => h.assignment.departmentId === s.employee.departmentId,
                ),
            )
            .map((s) => s.employee.departmentId),
        ).size,
        '/responsables',
        'Se consideran departamentos con empleados activos.',
      );
      add(
        'EMPLOYEE_ACCOUNT_REQUIRED',
        'Empleados sin cuenta activa vinculada',
        staff.filter((s) => !s.account?.active).length,
        '/empleados',
        'La cuenta permite ingresar y presentar solicitudes propias.',
      );
      let invalidSupervisor = 0,
        invalidChain = 0;
      for (const { employee } of staff) {
        const isHead = heads.some((h) => h.employee.id === employee.id);
        try {
          await validChain(
            db,
            {
              employeeId: employee.id,
              departmentId: employee.departmentId,
              headMode: isHead ? 'SUPERVISOR' : 'DEPARTMENT',
            },
            now,
          );
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !('code' in error) ||
            error.code !== 'APPROVAL_CHAIN_REQUIRED'
          )
            throw error;
          if (isHead) invalidSupervisor++;
          else invalidChain++;
        }
      }
      add(
        'HEAD_SUPERIOR_REQUIRED',
        'Jefaturas sin cadena válida para solicitar',
        invalidSupervisor,
        '/empleados',
        'Revisa un superior explícito con empleado y cuenta activos, distinto del solicitante.',
      );
      add(
        'APPROVAL_CHAIN_REQUIRED',
        'Empleados sin cadena completa de aprobación',
        invalidChain,
        '/responsables',
        'Se requiere jefatura o superior activo distinto del solicitante; el acceso ADMIN/HR no concede esa responsabilidad.',
      );
      const [policy] = await db
        .select({ id: leavePolicies.id })
        .from(leavePolicies)
        .limit(1);
      const [permission] = await db
        .select({ id: permissionTypes.id })
        .from(permissionTypes)
        .where(eq(permissionTypes.active, true))
        .limit(1);
      add(
        'LEAVE_POLICY_REQUIRED',
        'Falta política de vacaciones',
        policy ? 0 : 1,
        '/politicas-ausencias',
        'RR. HH. debe configurar la política empresarial.',
      );
      add(
        'PERMISSION_TYPES_REQUIRED',
        'Sin tipos de permiso activos',
        permission ? 0 : 1,
        '/politicas-ausencias',
        'Configura los permisos y sus requisitos.',
      );
      const granted = await db
        .select({ employeeId: vacationMovements.employeeId })
        .from(vacationMovements)
        .where(eq(vacationMovements.kind, 'GRANT'));
      add(
        'NO_VACATION_PERIODS',
        'Empleados sin períodos concedidos',
        staff.filter(
          (s) => !granted.some((g) => g.employeeId === s.employee.id),
        ).length,
        '/vacaciones',
        'Revisa antigüedad y períodos cumplidos. No implica que deban recibir una concesión.',
        'INFO',
      );
      return issues;
    },
    async configuration() {
      const [p] = await db
        .select()
        .from(leavePolicies)
        .orderBy(desc(leavePolicies.version))
        .limit(1);
      return {
        policy: p ? policyView(p) : null,
        permissionTypes: (
          await db
            .select()
            .from(permissionTypes)
            .orderBy(asc(permissionTypes.name))
        ).map(typeView),
      };
    },
    async savePolicy(input: LeavePolicyInput, scope: SessionView) {
      management(scope);
      return run('policy', input, scope, async (tx, now) => {
        const name = cleanText(input.name, 120);
        if (
          !input.entitlements.length ||
          input.entitlements[0]?.fromYear !== 1 ||
          input.entitlements.some(
            (x, i) =>
              !Number.isInteger(x.fromYear) ||
              !Number.isInteger(x.days) ||
              x.days < 1 ||
              x.days > 365 ||
              x.fromYear < 1 ||
              x.fromYear > 100 ||
              (i > 0 && input.entitlements[i - 1]!.fromYear >= x.fromYear),
          )
        )
          fail(
            'INVALID_POLICY',
            'Ordena las reglas desde el año 1 sin antigüedades duplicadas.',
          );
        for (const w of [
          input.administrativeWeekdays,
          input.operationalWeekdays,
        ])
          if (
            !w.length ||
            new Set(w).size !== w.length ||
            w.some((x) => !Number.isInteger(x) || x < 1 || x > 7)
          )
            fail('INVALID_POLICY', 'Calendario de días laborables inválido.');
        const [old] = await tx
          .select()
          .from(leavePolicies)
          .orderBy(desc(leavePolicies.version))
          .limit(1);
        const [p] = await tx
          .insert(leavePolicies)
          .values({
            name,
            entitlements: input.entitlements,
            administrativeWeekdays: input.administrativeWeekdays,
            operationalWeekdays: input.operationalWeekdays,
            excludeHolidays: input.excludeHolidays,
            version: (old?.version ?? 0) + 1,
            createdAt: now,
            createdBy: scope.user.id,
          })
          .returning();
        await recordAudit(tx, {
          action: 'leave.policy.created',
          entityType: 'leave_policy',
          entityId: p!.id,
          actorId: scope.user.id,
          after: { version: p!.version },
        });
        return policyView(p!);
      });
    },
    async savePermissionType(
      id: string | undefined,
      input: PermissionTypeInput,
      scope: SessionView,
    ) {
      management(scope);
      const result = await run(
        `permission-type:${id ?? 'new'}`,
        input,
        scope,
        async (tx) => {
          const name = cleanText(input.name, 120);
          const [old] = id
            ? await tx
                .select()
                .from(permissionTypes)
                .where(eq(permissionTypes.id, id))
            : [];
          if (id && !old)
            fail('TYPE_NOT_FOUND', 'Tipo de permiso no encontrado.', 404);
          const clash = await tx
            .select()
            .from(permissionTypes)
            .where(sql`lower(btrim(${permissionTypes.name}))=lower(${name})`);
          if (clash.some((x) => x.id !== id))
            fail('TYPE_CONFLICT', 'Ya existe un tipo con ese nombre.', 409);
          const minimumNoticeHours =
            input.minimumNoticeHours ?? old?.minimumNoticeHours ?? 0;
          const partialOnly = input.partialOnly ?? old?.partialOnly ?? false;
          if (
            !Number.isInteger(minimumNoticeHours) ||
            minimumNoticeHours < 0 ||
            minimumNoticeHours > 8760 ||
            (partialOnly && !input.allowPartial)
          )
            fail(
              'INVALID_PERMISSION_TYPE',
              'Revisa la anticipación y permite intervalos parciales si son obligatorios.',
            );
          const fields = {
            name,
            paid: input.paid,
            evidenceRequired: input.evidenceRequired,
            allowPartial: input.allowPartial,
            minimumNoticeHours,
            partialOnly,
            active: input.active,
            version: (old?.version ?? 0) + 1,
          };
          const [p] = id
            ? await tx
                .update(permissionTypes)
                .set(fields)
                .where(eq(permissionTypes.id, id))
                .returning()
            : await tx.insert(permissionTypes).values(fields).returning();
          await recordAudit(tx, {
            action: 'leave.permission_type.saved',
            entityType: 'permission_type',
            entityId: p!.id,
            actorId: scope.user.id,
            after: {
              version: p!.version,
              active: p!.active,
              paid: p!.paid,
              minimumNoticeHours: p!.minimumNoticeHours,
              partialOnly: p!.partialOnly,
              evidenceRequired: p!.evidenceRequired,
            },
          });
          return typeView(p!);
        },
      );
      // Successful operations saved before migration 0012 lack these fields.
      // Replays keep their historical values, even if the type changed later.
      return {
        ...result,
        minimumNoticeHours: result.minimumNoticeHours ?? 0,
        partialOnly: result.partialOnly ?? false,
      };
    },
    async list(scope: SessionView) {
      const rows = await db
        .select()
        .from(leaveRequests)
        .orderBy(desc(leaveRequests.createdAt), desc(leaveRequests.id));
      const result: LeaveRequestView[] = [];
      const now = clock();
      for (const r of rows)
        if (await canView(db, r, scope, now))
          result.push(await view(db, r, scope, now));
      return result;
    },
    async create(input: CreateRequestInput, scope: SessionView) {
      return run('request.create', input, scope, async (tx, now) => {
        const employee = await ownEmployee(tx, scope),
          reason = cleanText(input.reason);
        if ((input.evidence?.length ?? 0) > 3)
          fail('INVALID_EVIDENCE', 'Máximo tres archivos.');
        const files = (input.evidence ?? []).map(validateEvidence);
        let from = input.fromDate,
          to = input.toDate,
          days = 0,
          dates: string[] = [],
          period: number | null = null,
          policy: LeavePolicyView | null = null,
          permission: typeof permissionTypes.$inferSelect | undefined,
          incidentId: string | null = null,
          originalId: string | null = null,
          partialStartsAt: Date | null = null,
          partialEndsAt: Date | null = null,
          departmentId = employee.departmentId;
        const all = await currentAuthorities(tx, now);
        let headMode: 'DEPARTMENT' | 'SUPERVISOR' = all.some(
          (a) => a.assignment.kind === 'HEAD' && a.employee.id === employee.id,
        )
          ? 'SUPERVISOR'
          : 'DEPARTMENT';
        if (input.kind === 'JUSTIFICATION') {
          if (
            !input.incidentId ||
            input.originalRequestId ||
            input.permissionTypeId ||
            input.vacationPeriodYear ||
            input.partialStartsAt ||
            input.partialEndsAt
          )
            fail(
              'INVALID_REQUEST',
              'Selecciona únicamente una incidencia propia.',
            );
          const [incident] = await tx
            .select({
              incident: attendanceIncidents,
              slot: scheduleAssignments,
            })
            .from(attendanceIncidents)
            .innerJoin(
              scheduleAssignments,
              eq(scheduleAssignments.id, attendanceIncidents.assignmentId),
            )
            .where(
              and(
                eq(attendanceIncidents.id, input.incidentId),
                eq(attendanceIncidents.employeeId, employee.id),
              ),
            );
          if (!incident)
            fail('INCIDENT_NOT_FOUND', 'Incidencia propia no encontrada.', 404);
          const [duplicate] = await tx
            .select()
            .from(leaveRequests)
            .where(
              and(
                eq(leaveRequests.incidentId, input.incidentId),
                inArray(leaveRequests.status, [
                  'PENDING_HEAD',
                  'PENDING_DIRECTOR',
                  'APPROVED',
                ]),
              ),
            );
          if (duplicate)
            fail(
              'REQUEST_CONFLICT',
              'La incidencia ya tiene una justificación pendiente o aprobada.',
              409,
            );
          from = to = incident.slot.workDate;
          incidentId = input.incidentId;
        } else if (input.kind === 'CANCELLATION') {
          if (
            !input.originalRequestId ||
            input.incidentId ||
            input.permissionTypeId ||
            input.vacationPeriodYear ||
            input.partialStartsAt ||
            input.partialEndsAt
          )
            fail(
              'INVALID_REQUEST',
              'Selecciona únicamente la solicitud que se cancelará.',
            );
          const [original] = await tx
            .select()
            .from(leaveRequests)
            .where(
              and(
                eq(leaveRequests.id, input.originalRequestId),
                eq(leaveRequests.employeeId, employee.id),
              ),
            );
          if (
            !original ||
            original.status !== 'APPROVED' ||
            !['VACATION', 'PERMISSION'].includes(original.kind)
          )
            fail(
              'INVALID_CANCELLATION',
              'Solo se cancelan vacaciones/permisos propios aprobados.',
              409,
            );
          if (!future(original, now))
            fail(
              'CANCELLATION_STARTED',
              'No se cancela por este flujo una ausencia que ya inició.',
              409,
            );
          const [duplicate] = await tx
            .select()
            .from(leaveRequests)
            .where(
              and(
                eq(leaveRequests.originalRequestId, original.id),
                inArray(leaveRequests.status, [
                  'PENDING_HEAD',
                  'PENDING_DIRECTOR',
                  'APPROVED',
                ]),
              ),
            );
          if (duplicate)
            fail(
              'REQUEST_CONFLICT',
              'Ya existe una cancelación pendiente o aprobada.',
              409,
            );
          from = original.fromDate;
          to = original.toDate;
          originalId = original.id;
          departmentId = original.departmentId;
          headMode = original.headMode;
        } else {
          if (!from || !to || input.incidentId || input.originalRequestId)
            fail(
              'INVALID_REQUEST',
              'Indica fechas y tipo de solicitud válidos.',
            );
          dateRange(from, to);
          if (from < meridaDate(now))
            fail(
              'PAST_REQUEST',
              'Las ausencias se solicitan para hoy o fechas futuras; las incidencias se justifican por separado.',
            );
          if (input.kind === 'VACATION') {
            if (
              input.permissionTypeId ||
              input.partialStartsAt ||
              input.partialEndsAt ||
              !input.vacationPeriodYear
            )
              fail(
                'INVALID_REQUEST',
                'Selecciona el período de saldo y días completos de vacaciones.',
              );
            if (from <= meridaDate(now))
              fail(
                'VACATION_STARTED',
                'Solicita vacaciones para una fecha posterior a hoy.',
              );
            policy = policyView(await latestPolicy(tx));
            period = input.vacationPeriodYear;
            const holidaysList = policy.excludeHolidays
              ? (await tx.select().from(holidays)).map((x) => x.date)
              : [];
            dates = chargedDates(
              from,
              to,
              employee.category === 'ADMINISTRATIVE'
                ? policy.administrativeWeekdays
                : policy.operationalWeekdays,
              holidaysList,
            );
            days = dates.length;
            if (!days)
              fail(
                'NO_WORKING_DAYS',
                'El período no contiene días laborables cobrables.',
              );
            const b = await bank(tx, employee.id, period);
            if (b.balance - b.reserved < days)
              fail(
                'INSUFFICIENT_BALANCE',
                'Saldo disponible insuficiente.',
                409,
              );
          } else if (input.kind === 'PERMISSION') {
            if (!input.permissionTypeId || input.vacationPeriodYear)
              fail('INVALID_REQUEST', 'Selecciona un tipo de permiso.');
            [permission] = await tx
              .select()
              .from(permissionTypes)
              .where(
                and(
                  eq(permissionTypes.id, input.permissionTypeId),
                  eq(permissionTypes.active, true),
                ),
              );
            if (!permission)
              fail(
                'TYPE_NOT_FOUND',
                'Tipo de permiso activo no encontrado.',
                404,
              );
            if (permission.evidenceRequired && !files.length)
              fail('EVIDENCE_REQUIRED', 'Este permiso requiere evidencia.');
            if (
              permission.partialOnly &&
              (!input.partialStartsAt || !input.partialEndsAt)
            )
              fail(
                'PARTIAL_REQUIRED',
                'Este permiso requiere indicar inicio y fin de la ausencia por horas.',
              );
            if (input.partialStartsAt || input.partialEndsAt) {
              if (
                !permission.allowPartial ||
                !input.partialStartsAt ||
                !input.partialEndsAt
              )
                fail(
                  'INVALID_PARTIAL',
                  'El tipo no admite intervalo parcial o falta un extremo.',
                );
              partialStartsAt = new Date(input.partialStartsAt);
              partialEndsAt = new Date(input.partialEndsAt);
              if (
                !Number.isFinite(partialStartsAt.getTime()) ||
                !Number.isFinite(partialEndsAt.getTime()) ||
                partialEndsAt <= partialStartsAt ||
                meridaDate(partialStartsAt) !== from ||
                meridaDate(new Date(partialEndsAt.getTime() - 1)) !== to
              )
                fail(
                  'INVALID_PARTIAL',
                  'Las horas deben corresponder al período civil declarado en America/Merida.',
                );
            }
            // Mérida has a fixed UTC-06 offset for the current operational calendar.
            const absenceStartsAt =
              partialStartsAt ?? new Date(`${from}T00:00:00-06:00`);
            if (
              permission.minimumNoticeHours > 0 &&
              absenceStartsAt.getTime() - now.getTime() <
                permission.minimumNoticeHours * 3600000
            )
              fail(
                'INSUFFICIENT_NOTICE',
                `Solicita este permiso al menos ${permission.minimumNoticeHours} horas antes del inicio de la ausencia.`,
              );
          } else fail('INVALID_REQUEST', 'Tipo de solicitud inválido.');
          const overlap = await tx
            .select()
            .from(leaveRequests)
            .where(
              and(
                eq(leaveRequests.employeeId, employee.id),
                inArray(leaveRequests.kind, ['VACATION', 'PERMISSION']),
                inArray(leaveRequests.status, [
                  'PENDING_HEAD',
                  'PENDING_DIRECTOR',
                  'APPROVED',
                ]),
              ),
            );
          for (const r of overlap) {
            if (r.toDate < from || r.fromDate > to) continue;
            if (
              partialStartsAt &&
              partialEndsAt &&
              r.partialStartsAt &&
              r.partialEndsAt &&
              (partialStartsAt >= r.partialEndsAt ||
                partialEndsAt <= r.partialStartsAt)
            )
              continue;
            const candidate =
              input.kind === 'VACATION'
                ? dates
                : chargedDates(from, to, [1, 2, 3, 4, 5, 6, 7], []);
            const existing =
              r.kind === 'VACATION'
                ? r.chargedDates
                : chargedDates(r.fromDate, r.toDate, [1, 2, 3, 4, 5, 6, 7], []);
            if (candidate.some((d) => existing.includes(d)))
              fail(
                'REQUEST_OVERLAP',
                'Ya existe una ausencia pendiente o aprobada en ese período.',
                409,
              );
          }
        }
        civil(from!);
        civil(to!);
        await validChain(
          tx,
          {
            employeeId: employee.id,
            departmentId,
            headMode,
            approvalFlow: creationFlow,
          },
          now,
        );
        const [r] = await tx
          .insert(leaveRequests)
          .values({
            kind: input.kind,
            employeeId: employee.id,
            departmentId,
            reason,
            fromDate: from!,
            toDate: to!,
            partialStartsAt,
            partialEndsAt,
            vacationPeriodYear: period,
            days,
            chargedDates: dates,
            policySnapshot: policy,
            permissionTypeId: permission?.id ?? null,
            permissionSnapshot: permission
              ? {
                  name: permission.name,
                  paid: permission.paid,
                  evidenceRequired: permission.evidenceRequired,
                  allowPartial: permission.allowPartial,
                  minimumNoticeHours: permission.minimumNoticeHours,
                  partialOnly: permission.partialOnly,
                  version: permission.version,
                }
              : null,
            incidentId,
            originalRequestId: originalId,
            headMode,
            approvalFlow: creationFlow,
            createdAt: now,
            createdBy: scope.user.id,
          })
          .returning();
        for (const f of files)
          await tx.insert(requestEvidence).values({
            requestId: r!.id,
            filename: f.filename,
            mimeType: f.mimeType,
            sizeBytes: f.bytes.length,
            content: f.bytes,
          });
        if (input.kind === 'VACATION')
          await move(tx, {
            employeeId: employee.id,
            anniversaryYear: period!,
            kind: 'RESERVE',
            balanceDelta: 0,
            reservedDelta: days,
            reason: 'Reserva de vacaciones solicitadas',
            requestId: r!.id,
            dedupeKey: `reserve:${r!.id}`,
            createdAt: now,
            createdBy: scope.user.id,
          });
        await notify(tx, r!, 'leave.request.created', scope, now);
        return view(tx, r!, scope, now);
      });
    },
    async decide(id: string, input: RequestDecisionInput, scope: SessionView) {
      return run(`request.decide:${id}`, input, scope, async (tx, now) => {
        const r = await find(tx, id, scope, now);
        const actor = await ownEmployee(tx, scope);
        if (r.employeeId === actor.id || r.createdBy === scope.user.id)
          fail(
            'SELF_APPROVAL',
            'No puedes aprobar ni rechazar tu propia solicitud.',
            403,
          );
        if (!['PENDING_HEAD', 'PENDING_DIRECTOR'].includes(r.status))
          fail('REQUEST_RESOLVED', 'La solicitud ya tiene resolución.', 409);
        const [employee] = await tx
          .select()
          .from(employees)
          .where(eq(employees.id, r.employeeId));
        if (!employee || employee.status !== 'ACTIVE')
          fail(
            'EMPLOYEE_INACTIVE',
            'No se resuelven solicitudes de un empleado inactivo.',
            409,
          );
        const step = r.status === 'PENDING_HEAD' ? 'HEAD' : 'DIRECTOR';
        if (step === 'DIRECTOR' && r.approvalFlow !== 'HEAD_DIRECTOR')
          fail(
            'REQUEST_RESOLVED',
            'La decisión de jefatura es definitiva.',
            409,
          );
        const finalStep = step === 'DIRECTOR' || r.approvalFlow === 'HEAD_ONLY';
        const prior = await tx
          .select()
          .from(requestDecisions)
          .where(eq(requestDecisions.requestId, id));
        if (prior.some((d) => d.actorId === scope.user.id))
          fail(
            'DISTINCT_APPROVER_REQUIRED',
            'Los dos pasos requieren personas distintas.',
            403,
          );
        const authorities =
          step === 'HEAD'
            ? await headAuthorities(tx, r, now)
            : await directorAuthorities(tx, now);
        const authority = authorities.find(
          (a) => a.userId === scope.user.id && a.employeeId === actor.id,
        );
        if (!authority)
          fail(
            'APPROVER_REQUIRED',
            'No tienes la responsabilidad vigente para resolver este paso.',
            403,
          );
        const reason = cleanText(input.reason);
        if (!['APPROVE', 'REJECT'].includes(input.decision))
          fail('INVALID_DECISION', 'Decisión inválida.');
        if (input.decision === 'APPROVE' && step === 'HEAD' && !finalStep) {
          const directors = await directorAuthorities(tx, now);
          if (
            !directors.some(
              (d) =>
                d.userId !== scope.user.id && d.employeeId !== r.employeeId,
            )
          )
            fail(
              'APPROVAL_CHAIN_REQUIRED',
              'Configura una dirección distinta del jefe y del solicitante.',
              409,
            );
        }
        if (
          input.decision === 'APPROVE' &&
          finalStep &&
          r.kind === 'CANCELLATION'
        ) {
          const [original] = await tx
            .select()
            .from(leaveRequests)
            .where(eq(leaveRequests.id, r.originalRequestId!));
          if (
            !original ||
            original.status !== 'APPROVED' ||
            !future(original, now)
          )
            fail(
              'CANCELLATION_STARTED',
              'La ausencia ya inició o dejó de estar aprobada; no se revierte el saldo.',
              409,
            );
          await tx
            .update(leaveRequests)
            .set({ status: 'CANCELLED' })
            .where(eq(leaveRequests.id, original.id));
          if (original.kind === 'VACATION')
            await move(tx, {
              employeeId: original.employeeId,
              anniversaryYear: original.vacationPeriodYear!,
              kind: 'REFUND',
              balanceDelta: original.days,
              reservedDelta: 0,
              reason:
                r.approvalFlow === 'HEAD_ONLY'
                  ? 'Reversión por cancelación aprobada por jefatura'
                  : 'Reversión por cancelación aprobada en dos pasos',
              requestId: original.id,
              dedupeKey: `refund:${original.id}`,
              createdAt: now,
              createdBy: scope.user.id,
            });
          await notify(
            tx,
            { ...original, status: 'CANCELLED' },
            'leave.request.cancelled',
            scope,
            now,
          );
        }
        await tx.insert(requestDecisions).values({
          requestId: id,
          step,
          decision: input.decision,
          reason,
          actorId: scope.user.id,
          actorName: scope.user.name,
          assignmentId: authority.assignmentId,
          authoritySnapshot: authority.snapshot,
          createdAt: now,
        });
        const status =
          input.decision === 'REJECT'
            ? 'REJECTED'
            : finalStep
              ? 'APPROVED'
              : 'PENDING_DIRECTOR';
        if (status === 'REJECTED')
          await release(tx, r, scope.user.id, now, 'RELEASE');
        if (status === 'APPROVED' && r.kind === 'VACATION')
          await move(tx, {
            employeeId: r.employeeId,
            anniversaryYear: r.vacationPeriodYear!,
            kind: 'CONSUME',
            balanceDelta: -r.days,
            reservedDelta: -r.days,
            reason:
              r.approvalFlow === 'HEAD_ONLY'
                ? 'Vacaciones autorizadas definitivamente por jefatura'
                : 'Vacaciones autorizadas por jefe y director',
            requestId: r.id,
            dedupeKey: `consume:${r.id}`,
            createdAt: now,
            createdBy: scope.user.id,
          });
        const [updated] = await tx
          .update(leaveRequests)
          .set({
            status,
            resolvedAt: ['APPROVED', 'REJECTED'].includes(status) ? now : null,
          })
          .where(eq(leaveRequests.id, id))
          .returning();
        await notify(tx, updated!, 'leave.request.decided', scope, now);
        return view(tx, updated!, scope, now);
      });
    },
    async withdraw(
      id: string,
      input: RequestWithdrawInput,
      scope: SessionView,
    ) {
      return run(`request.withdraw:${id}`, input, scope, async (tx, now) => {
        const employee = await ownEmployee(tx, scope);
        const [r] = await tx
          .select()
          .from(leaveRequests)
          .where(
            and(
              eq(leaveRequests.id, id),
              eq(leaveRequests.employeeId, employee.id),
            ),
          );
        if (!r)
          fail('REQUEST_NOT_FOUND', 'Solicitud propia no encontrada.', 404);
        if (!['PENDING_HEAD', 'PENDING_DIRECTOR'].includes(r.status))
          fail(
            'REQUEST_RESOLVED',
            'Solo se retiran solicitudes pendientes.',
            409,
          );
        const withdrawal = {
          reason: cleanText(input.reason),
          actorId: scope.user.id,
          createdAt: now.toISOString(),
        };
        await release(tx, r, scope.user.id, now, 'RELEASE');
        const [updated] = await tx
          .update(leaveRequests)
          .set({ status: 'WITHDRAWN', resolvedAt: now, withdrawal })
          .where(eq(leaveRequests.id, id))
          .returning();
        await notify(tx, updated!, 'leave.request.withdrawn', scope, now);
        return view(tx, updated!, scope, now);
      });
    },
    async evidence(id: string, evidenceId: string, scope: SessionView) {
      const r = await find(db, id, scope, clock());
      const [f] = await db
        .select()
        .from(requestEvidence)
        .where(
          and(
            eq(requestEvidence.id, evidenceId),
            eq(requestEvidence.requestId, r.id),
          ),
        );
      if (!f) fail('EVIDENCE_NOT_FOUND', 'Evidencia no encontrada.', 404);
      return f;
    },
    async balances(scope: SessionView) {
      const ee = await db.select().from(employees);
      const result: VacationBalanceView[] = [];
      for (const e of ee) {
        if (
          !scope.permissions.viewAllEmployees &&
          e.id !== scope.employeeId &&
          !scope.managedDepartmentIds.includes(e.departmentId)
        )
          continue;
        const movements = await db
          .select({ year: vacationMovements.anniversaryYear })
          .from(vacationMovements)
          .where(eq(vacationMovements.employeeId, e.id));
        for (const year of [...new Set(movements.map((x) => x.year))].sort(
          (a, b) => b - a,
        ))
          result.push(await balanceView(db, e, year, clock()));
      }
      return result;
    },
    async grant(input: VacationGrantInput, scope: SessionView) {
      management(scope);
      return run('vacation.grant', input, scope, async (tx, now) => {
        const p = await latestPolicy(tx);
        const [e] = await tx
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, input.employeeId),
              eq(employees.status, 'ACTIVE'),
            ),
          );
        if (!e)
          fail('EMPLOYEE_NOT_FOUND', 'Empleado activo no encontrado.', 404);
        if (
          anniversaryDate(e.joinedOn, input.anniversaryYear) > meridaDate(now)
        )
          fail(
            'ANNIVERSARY_NOT_DUE',
            'El aniversario todavía no se cumple.',
            409,
          );
        const dedupeKey = `grant:${e.id}:${input.anniversaryYear}`;
        const [old] = await tx
          .select()
          .from(vacationMovements)
          .where(eq(vacationMovements.dedupeKey, dedupeKey));
        if (old)
          fail(
            'ALREADY_GRANTED',
            'Ese aniversario ya tiene una concesión.',
            409,
          );
        const days = entitlementDays(p.entitlements, input.anniversaryYear);
        await move(tx, {
          employeeId: e.id,
          anniversaryYear: input.anniversaryYear,
          kind: 'GRANT',
          balanceDelta: days,
          reservedDelta: 0,
          reason: cleanText(input.reason),
          policyId: p.id,
          dedupeKey,
          createdAt: now,
          createdBy: scope.user.id,
        });
        await recordAudit(tx, {
          action: 'vacation.granted',
          entityType: 'employee',
          entityId: e.id,
          actorId: scope.user.id,
          after: {
            anniversaryYear: input.anniversaryYear,
            days,
            policyVersion: p.version,
          },
        });
        return balanceView(tx, e, input.anniversaryYear, now);
      });
    },
    async adjust(input: VacationAdjustmentInput, scope: SessionView) {
      management(scope);
      return run('vacation.adjust', input, scope, async (tx, now) => {
        const [e] = await tx
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.id, input.employeeId),
              eq(employees.status, 'ACTIVE'),
            ),
          );
        if (!e)
          fail('EMPLOYEE_NOT_FOUND', 'Empleado activo no encontrado.', 404);
        if (
          !Number.isInteger(input.days) ||
          input.days === 0 ||
          Math.abs(input.days) > 365
        )
          fail(
            'INVALID_ADJUSTMENT',
            'Indica un ajuste entero distinto de cero, máximo 365 días.',
          );
        if (
          anniversaryDate(e.joinedOn, input.anniversaryYear) > meridaDate(now)
        )
          fail(
            'ANNIVERSARY_NOT_DUE',
            'El aniversario todavía no se cumple.',
            409,
          );
        const b = await bank(tx, e.id, input.anniversaryYear);
        if (b.balance - b.reserved + input.days < 0)
          fail(
            'INSUFFICIENT_BALANCE',
            'El ajuste dejaría un saldo disponible negativo.',
            409,
          );
        await move(tx, {
          employeeId: e.id,
          anniversaryYear: input.anniversaryYear,
          kind: 'ADJUSTMENT',
          balanceDelta: input.days,
          reservedDelta: 0,
          reason: cleanText(input.reason),
          dedupeKey: `adjust:${input.idempotencyKey}`,
          createdAt: now,
          createdBy: scope.user.id,
        });
        await recordAudit(tx, {
          action: 'vacation.adjusted',
          entityType: 'employee',
          entityId: e.id,
          actorId: scope.user.id,
          after: { anniversaryYear: input.anniversaryYear, days: input.days },
        });
        return balanceView(tx, e, input.anniversaryYear, now);
      });
    },
  };
}
export type RequestService = ReturnType<typeof createRequestService>;
