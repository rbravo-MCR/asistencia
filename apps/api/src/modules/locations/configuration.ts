import { and, eq, isNull } from 'drizzle-orm';
import type { ConfigurationIssue } from '@asistencia/contracts';
import type { Database } from '../../infrastructure/database/client.js';
import { employees } from '../employees/schema.js';
import { workLocations, locationAuthorizations } from './schema.js';
export async function readLocationConfiguration(
  db: Database,
  date: string,
): Promise<ConfigurationIssue[]> {
  const onsite = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(employees.status, 'ACTIVE'),
        eq(employees.category, 'ADMINISTRATIVE'),
      ),
    );
  const centers = await db
    .select()
    .from(workLocations)
    .where(eq(workLocations.active, true));
  const authorizations = await db
    .select()
    .from(locationAuthorizations)
    .where(isNull(locationAuthorizations.revokedAt));
  const issues: ConfigurationIssue[] = [];
  if (onsite.length && !centers.length)
    issues.push({
      code: 'WORKSITE_REQUIRED',
      title: 'Falta un centro de trabajo activo',
      detail: 'El personal presencial necesita un centro autorizado.',
      count: onsite.length,
      severity: 'WARNING',
      href: '/ubicaciones',
    });
  const missing = onsite.filter(
    (e) =>
      !authorizations.some(
        (a) =>
          a.employeeId === e.id &&
          a.startsOn <= date &&
          (!a.endsOn || a.endsOn >= date) &&
          centers.some((c) => c.id === a.locationId),
      ),
  ).length;
  if (missing)
    issues.push({
      code: 'LOCATION_AUTHORIZATION_REQUIRED',
      title: 'Sin autorización de centro vigente',
      detail:
        'Revisa las autorizaciones del personal presencial. Home office no requiere GPS.',
      count: missing,
      severity: 'WARNING',
      href: '/ubicaciones',
    });
  return issues;
}
