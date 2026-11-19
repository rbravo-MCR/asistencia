import { attendanceSearch, dateRangeSearch } from '@/lib/date-range-search';
import { requestIntentSearch } from '@/lib/request-intent';
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  type RouterHistory,
} from '@tanstack/react-router';
import { RootLayout } from './root-layout';
import { RoutePendingPage } from '@/pages/route-pending-page';
import { HomePage } from '@/pages/home-page';
import { SystemPage } from '@/pages/system-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { RouteErrorPage } from '@/pages/route-error-page';
import {
  LoginPage,
  RecoverPage,
  AccountPage,
} from '@/features/identity/auth-pages';

export function createAppRouter(
  history: RouterHistory = createBrowserHistory(),
) {
  const rootRoute = createRootRoute({
    component: RootLayout,
    notFoundComponent: NotFoundPage,
    errorComponent: RouteErrorPage,
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: HomePage,
  });
  const systemRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/estado',
    component: SystemPage,
  });
  const departmentsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/departamentos',
    component: lazyRouteComponent(
      () => import('@/pages/departments-page'),
      'DepartmentsPage',
    ),
  });
  const identityRoutes = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/configuracion',
      component: lazyRouteComponent(
        () => import('@/features/configuration/configuration-page'),
        'ConfigurationPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/configuracion/asistencia',
      component: lazyRouteComponent(
        () => import('@/features/attendance/attendance-policy'),
        'AttendancePolicyPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/solicitudes',
      validateSearch: requestIntentSearch,
      component: lazyRouteComponent(
        () => import('@/features/requests/requests-pages'),
        'RequestsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/aprobaciones',
      component: lazyRouteComponent(
        () => import('@/features/requests/requests-pages'),
        'ApprovalsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/vacaciones',
      validateSearch: (input: Record<string, unknown>): { view?: 'team' } =>
        input.view === 'team' ? { view: 'team' } : {},
      component: lazyRouteComponent(
        () => import('@/features/requests/requests-pages'),
        'VacationPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/politicas-ausencias',
      component: lazyRouteComponent(
        () => import('@/features/requests/requests-pages'),
        'LeavePoliciesPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/asistencia',
      validateSearch: attendanceSearch,
      component: lazyRouteComponent(
        () => import('@/features/attendance/attendance-pages'),
        'AttendancePage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/incidencias',
      validateSearch: dateRangeSearch,
      component: lazyRouteComponent(
        () => import('@/features/attendance/attendance-pages'),
        'IncidentsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/auditoria',
      component: lazyRouteComponent(
        () => import('@/features/audit/audit-page'),
        'AuditPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/avisos',
      component: lazyRouteComponent(
        () => import('@/features/notifications/notifications-page'),
        'NotificationsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/calendario',
      validateSearch: dateRangeSearch,
      component: lazyRouteComponent(
        () => import('@/features/planning/calendar-page'),
        'CalendarPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/turnos',
      component: lazyRouteComponent(
        () => import('@/features/planning/shifts-page'),
        'ShiftsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/ubicaciones',
      component: lazyRouteComponent(
        () => import('@/features/locations/locations-page'),
        'LocationsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/ingresar',
      component: LoginPage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/recuperar',
      component: RecoverPage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/cuenta',
      component: AccountPage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/usuarios',
      component: lazyRouteComponent(
        () => import('@/features/identity/users-page'),
        'UsersPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/empleados',
      component: lazyRouteComponent(
        () => import('@/features/employees/employees-page'),
        'EmployeesPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/responsables',
      component: lazyRouteComponent(
        () => import('@/features/employees/assignments-page'),
        'AssignmentsPage',
      ),
    }),
  ];
  return createRouter({
    routeTree: rootRoute.addChildren([
      ...identityRoutes,
      homeRoute,
      departmentsRoute,
      systemRoute,
    ]),
    history,
    defaultPreload: 'intent',
    defaultPendingComponent: RoutePendingPage,
    defaultPendingMs: 100,
    defaultPendingMinMs: 0,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
