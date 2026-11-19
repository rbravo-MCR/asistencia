import type {
  DashboardView,
  ConfigurationStatusView,
  SessionView,
} from '@asistencia/contracts';
import type { Database } from '../../infrastructure/database/client.js';
import { readAttendanceDashboard } from '../attendance/index.js';
import { createRequestService } from '../requests/index.js';
import { createAuditService } from '../audit/index.js';
import { readPlanningConfiguration } from '../planning/index.js';
import { readLocationConfiguration } from '../locations/index.js';
import { HttpError } from '../../infrastructure/http/errors.js';
export function dashboardDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function createDashboardService(
  db: Database,
  options: { timeZone: string; clock?: () => Date },
) {
  const clock = options.clock ?? (() => new Date());
  const requests = createRequestService(db, { clock });
  return {
    async get(scope: SessionView): Promise<DashboardView> {
      const now = clock(),
        date = dashboardDate(now, options.timeZone);
      const [attendance, allRequests, balances, inbox] = await Promise.all([
        readAttendanceDashboard(db, scope, date, now),
        requests.list(scope),
        scope.employeeId
          ? requests.balances({
              ...scope,
              managedDepartmentIds: [],
              permissions: { ...scope.permissions, viewAllEmployees: false },
            })
          : Promise.resolve([]),
        createAuditService(db).inbox(scope.user.id),
      ]);
      return {
        generatedAt: now.toISOString(),
        date,
        timeZone: options.timeZone,
        teamVisible:
          scope.permissions.viewAllEmployees ||
          scope.managedDepartmentIds.length > 0,
        unreadNotifications: inbox.unreadCount,
        attendance: {
          shifts: attendance.shifts,
          incidents: attendance.incidents,
        },
        personal: scope.employeeId
          ? {
              shift: attendance.personalShift,
              balances: balances.map((b) => ({
                anniversaryYear: b.anniversaryYear,
                available: b.available,
                reserved: b.reserved,
              })),
            }
          : null,
        pendingRequests: allRequests
          .filter(
            (r) =>
              r.status === 'PENDING_HEAD' || r.status === 'PENDING_DIRECTOR',
          )
          .map((r) => ({
            id: r.id,
            employeeId: r.employeeId,
            employeeName: r.employeeName,
            kind: r.kind,
            status: r.status,
            fromDate: r.fromDate,
            toDate: r.toDate,
            canDecide: r.canHeadDecide || r.canDirectorDecide,
          })),
      };
    },
    async configuration(scope: SessionView): Promise<ConfigurationStatusView> {
      if (!scope.permissions.manageOrganization)
        throw new HttpError(
          403,
          'MANAGEMENT_REQUIRED',
          'Se requiere ADMIN o Recursos Humanos.',
        );
      const now = clock(),
        date = dashboardDate(now, options.timeZone);
      const throughDate = new Date(
        Date.parse(`${date}T12:00:00Z`) + 6 * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      const parts = await Promise.all([
        requests.configurationIssues(),
        readPlanningConfiguration(db, date, throughDate),
        readLocationConfiguration(db, date),
      ]);
      return {
        generatedAt: now.toISOString(),
        date,
        timeZone: options.timeZone,
        throughDate,
        issues: parts.flat(),
      };
    },
  };
}
export type DashboardService = ReturnType<typeof createDashboardService>;
