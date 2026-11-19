import { describe, expect, it } from 'vitest';
import {
  evaluateGeofence,
  haversineMeters,
} from '../src/modules/locations/domain/geofence.js';
const site = {
  id: 'site',
  latitude: 21.0364532482013,
  longitude: -89.62273424224803,
  radiusMeters: 10,
  maxAccuracyMeters: 10,
};
describe('geofence independent distance and accuracy', () => {
  it('accepts center and exact accuracy limit', () =>
    expect(
      evaluateGeofence(false, [site], { ...site, accuracy: 10 }).result,
    ).toBe('VALID'));
  it('rejects outside even with excellent accuracy', () =>
    expect(
      evaluateGeofence(false, [site], {
        ...site,
        latitude: site.latitude + 0.001,
        accuracy: 1,
      }).result,
    ).toBe('OUTSIDE_GEOFENCE'));
  it('rejects insufficient accuracy at center', () =>
    expect(
      evaluateGeofence(false, [site], { ...site, accuracy: 11 }).result,
    ).toBe('ACCURACY_INSUFFICIENT'));
  it('retains missing GPS result and rejects nonfinite coordinates', () => {
    expect(evaluateGeofence(false, [site], {}).result).toBe(
      'LOCATION_REQUIRED',
    );
    expect(
      evaluateGeofence(false, [site], { ...site, latitude: NaN, accuracy: 1 })
        .result,
    ).toBe('LOCATION_REQUIRED');
  });
  it('does not require home GPS', () =>
    expect(evaluateGeofence(true, [], { latitude: NaN }).result).toBe(
      'NOT_REQUIRED',
    ));
  it('requires authorized locations', () =>
    expect(evaluateGeofence(false, [], site).result).toBe(
      'NO_AUTHORIZED_LOCATION',
    ));
  it('passes any authorized site and computes 10m boundary independently', () => {
    const point = {
      latitude: site.latitude + ((10 / 6371000) * 180) / Math.PI,
      longitude: site.longitude,
      accuracy: 1,
    };
    expect(haversineMeters(site, point)).toBeCloseTo(10, 7);
    expect(
      evaluateGeofence(false, [{ ...site, latitude: 0 }, site], point).result,
    ).toBe('VALID');
  });
});

it('treats missing accuracy as insufficient and rejects coordinate bounds', () => {
  expect(evaluateGeofence(false, [site], site).result).toBe(
    'ACCURACY_INSUFFICIENT',
  );
  expect(
    evaluateGeofence(false, [site], { latitude: 91, longitude: 0, accuracy: 1 })
      .result,
  ).toBe('LOCATION_REQUIRED');
});
it('evaluates each site precision policy independently of nearest distance', () => {
  const nearby = { ...site, id: 'nearest', maxAccuracyMeters: 1 };
  const second = {
    ...site,
    id: 'second',
    latitude: site.latitude + 0.00001,
    maxAccuracyMeters: 10,
  };
  expect(
    evaluateGeofence(false, [nearby, second], { ...site, accuracy: 5 }),
  ).toMatchObject({ result: 'VALID', locationId: 'second' });
});
