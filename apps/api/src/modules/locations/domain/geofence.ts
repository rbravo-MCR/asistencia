export interface Point {
  latitude: number;
  longitude: number;
}
export interface Geofence extends Point {
  id: string;
  radiusMeters: number;
  maxAccuracyMeters: number;
}
export type GeoResult =
  | 'VALID'
  | 'OUTSIDE_GEOFENCE'
  | 'ACCURACY_INSUFFICIENT'
  | 'LOCATION_REQUIRED'
  | 'NO_AUTHORIZED_LOCATION'
  | 'NOT_REQUIRED';
export function haversineMeters(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function validPoint<T extends Partial<Point>>(
  point: T,
): point is T & Point {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude!) <= 90 &&
    Math.abs(point.longitude!) <= 180
  );
}
export function evaluateGeofence(
  home: boolean,
  sites: Geofence[],
  point: Partial<Point> & { accuracy?: number },
): {
  result: GeoResult;
  distanceMeters: number | null;
  locationId: string | null;
} {
  const empty = (result: GeoResult) => ({
    result,
    distanceMeters: null,
    locationId: null,
  });
  if (home) return empty('NOT_REQUIRED');
  if (!sites.length) return empty('NO_AUTHORIZED_LOCATION');
  if (!validPoint(point)) return empty('LOCATION_REQUIRED');
  const evaluated = sites
    .map((site) => ({ site, distance: haversineMeters(site, point) }))
    .sort((a, b) => a.distance - b.distance);
  const valid = evaluated.find(
    ({ site, distance }) =>
      Number.isFinite(point.accuracy) &&
      point.accuracy! >= 0 &&
      point.accuracy! <= site.maxAccuracyMeters &&
      distance <= site.radiusMeters + 1e-8,
  );
  const chosen =
    valid ??
    evaluated.find(
      ({ site }) =>
        Number.isFinite(point.accuracy) &&
        point.accuracy! >= 0 &&
        point.accuracy! <= site.maxAccuracyMeters,
    ) ??
    evaluated[0]!;
  return {
    result: valid
      ? 'VALID'
      : !Number.isFinite(point.accuracy) ||
          point.accuracy! < 0 ||
          point.accuracy! > chosen.site.maxAccuracyMeters
        ? 'ACCURACY_INSUFFICIENT'
        : 'OUTSIDE_GEOFENCE',
    distanceMeters: chosen.distance,
    locationId: chosen.site.id,
  };
}
export class LocationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
