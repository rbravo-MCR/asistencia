import {
  Bell,
  CalendarDays,
  CalendarClock,
  Clock3,
  ClipboardList,
  CheckCheck,
  Umbrella,
  Users,
  Building2,
  Network,
  MapPin,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  LayoutDashboard,
  ScrollText,
  HeartPulse,
  CircleUserRound,
  type LucideIcon,
} from 'lucide-react';
import type { SessionView } from '@asistencia/contracts';

type AppPath =
  | '/'
  | '/avisos'
  | '/asistencia'
  | '/calendario'
  | '/incidencias'
  | '/turnos'
  | '/ubicaciones'
  | '/empleados'
  | '/departamentos'
  | '/responsables'
  | '/solicitudes'
  | '/aprobaciones'
  | '/vacaciones'
  | '/usuarios'
  | '/auditoria'
  | '/configuracion'
  | '/configuracion/asistencia'
  | '/politicas-ausencias'
  | '/cuenta'
  | '/estado';
export type NavigationItem = {
  to: AppPath;
  label: string;
  description?: string;
  keywords?: string[];
  icon: LucideIcon;
  permission?: 'manageUsers' | 'manageOrganization';
};
export type NavigationGroup = { label: string; items: NavigationItem[] };
const groups: NavigationGroup[] = [
  {
    label: 'General',
    items: [
      { to: '/', label: 'Inicio', icon: LayoutDashboard },
      { to: '/avisos', label: 'Avisos', icon: Bell },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/asistencia', label: 'Asistencia', icon: Clock3 },
      {
        to: '/calendario',
        label: 'Mis horarios',
        icon: CalendarDays,
        description: 'Consulta los turnos publicados y sus horarios.',
        keywords: ['calendario', 'horarios', 'asignar', 'turnos'],
      },
      { to: '/incidencias', label: 'Incidencias', icon: ClipboardList },
      {
        to: '/turnos',
        label: 'Plantillas de turno',
        description: 'Define horarios reutilizables antes de asignarlos.',
        keywords: ['turnos', 'horarios'],
        icon: CalendarClock,
        permission: 'manageOrganization',
      },
      { to: '/ubicaciones', label: 'Ubicaciones', icon: MapPin },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { to: '/empleados', label: 'Empleados', icon: Users },
      { to: '/departamentos', label: 'Departamentos', icon: Building2 },
      { to: '/responsables', label: 'Responsables', icon: Network },
    ],
  },
  {
    label: 'Solicitudes',
    items: [
      {
        to: '/solicitudes',
        label: 'Solicitudes',
        icon: ScrollText,
        description:
          'Pide vacaciones, permisos o justificaciones y sigue su estado.',
        keywords: ['pedir', 'vacaciones', 'permisos'],
      },
      { to: '/aprobaciones', label: 'Aprobaciones', icon: CheckCheck },
      {
        to: '/vacaciones',
        label: 'Días disponibles',
        icon: Umbrella,
        description: 'Consulta períodos, saldos y movimientos de vacaciones.',
        keywords: ['vacaciones', 'saldo', 'saldos', 'días'],
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        to: '/usuarios',
        label: 'Usuarios',
        icon: UserRoundCog,
        permission: 'manageUsers',
      },
      {
        to: '/auditoria',
        label: 'Auditoría',
        icon: ShieldCheck,
        permission: 'manageUsers',
      },
      {
        to: '/configuracion',
        label: 'Configuración',
        icon: Settings2,
        permission: 'manageOrganization',
      },
      {
        to: '/politicas-ausencias',
        label: 'Políticas de ausencias',
        icon: ScrollText,
        permission: 'manageOrganization',
      },
    ],
  },
  {
    label: 'Cuenta y sistema',
    items: [
      { to: '/cuenta', label: 'Mi cuenta', icon: CircleUserRound },
      { to: '/estado', label: 'Estado del sistema', icon: HeartPulse },
    ],
  },
];
export function navigationFor(
  permissions: SessionView['permissions'] | undefined,
): NavigationGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !item.permission || permissions?.[item.permission])
        .map((item) =>
          item.to === '/calendario' && permissions?.manageOrganization
            ? {
                ...item,
                label: 'Asignar turnos',
                description:
                  'Asigna y publica turnos para tu equipo; consulta sus horarios.',
              }
            : item,
        ),
    }))
    .filter((group) => group.items.length > 0);
}
export function navigationLocation(
  path: string,
  navigation: NavigationGroup[],
) {
  if (path === '/configuracion/asistencia')
    return { group: 'Administración', label: 'Política de asistencia' };
  for (const group of navigation) {
    const item = group.items.find((item) => item.to === path);
    if (item) return { group: group.label, label: item.label };
  }
  return { group: 'MCR', label: 'Gestión de personal' };
}
