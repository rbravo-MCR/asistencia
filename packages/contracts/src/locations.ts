import { Type, type Static } from 'typebox';
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const DateOnly = Type.String({ format: 'date' });
const NullableId = Type.Union([Id, Type.Null()]);
const strict = { additionalProperties: false };
const fields = {
  name: Type.String({ minLength: 1, maxLength: 120 }),
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
  radiusMeters: Type.Number({ exclusiveMinimum: 0, maximum: 100000 }),
  maxAccuracyMeters: Type.Number({ exclusiveMinimum: 0, maximum: 100000 }),
  active: Type.Boolean(),
};
export const LocationInputSchema = Type.Object(fields, strict);
export const LocationSchema = Type.Object(
  { id: Id, ...fields, createdAt: Instant, updatedAt: Instant },
  strict,
);
export const LocationListSchema = Type.Object(
  { items: Type.Array(LocationSchema) },
  strict,
);
const authorization = {
  employeeId: Id,
  locationId: Id,
  startsOn: DateOnly,
  endsOn: Type.Union([DateOnly, Type.Null()]),
};
export const LocationAuthorizationInputSchema = Type.Object(
  authorization,
  strict,
);
export const LocationAuthorizationSchema = Type.Object(
  {
    id: Id,
    ...authorization,
    revokedAt: Type.Union([Instant, Type.Null()]),
    createdAt: Instant,
    createdBy: Id,
  },
  strict,
);
export const LocationAuthorizationListSchema = Type.Object(
  { items: Type.Array(LocationAuthorizationSchema) },
  strict,
);
export const GeoCheckInputSchema = Type.Object(
  {
    employeeId: Type.Optional(Id),
    latitude: Type.Optional(fields.latitude),
    longitude: Type.Optional(fields.longitude),
    accuracy: Type.Optional(Type.Number({ minimum: 0 })),
  },
  strict,
);
export const GeoCheckSchema = Type.Object(
  {
    id: Id,
    employeeId: Id,
    result: Type.Union([
      Type.Literal('VALID'),
      Type.Literal('OUTSIDE_GEOFENCE'),
      Type.Literal('ACCURACY_INSUFFICIENT'),
      Type.Literal('LOCATION_REQUIRED'),
      Type.Literal('NO_AUTHORIZED_LOCATION'),
      Type.Literal('NOT_REQUIRED'),
    ]),
    checkedAt: Instant,
    distanceMeters: Type.Union([Type.Number(), Type.Null()]),
    locationId: NullableId,
  },
  strict,
);
export type LocationInput = Static<typeof LocationInputSchema>;
export type LocationView = Static<typeof LocationSchema>;
export type LocationAuthorizationInput = Static<
  typeof LocationAuthorizationInputSchema
>;
export type LocationAuthorizationView = Static<
  typeof LocationAuthorizationSchema
>;
export type GeoCheckInput = Static<typeof GeoCheckInputSchema>;
export type GeoCheckView = Static<typeof GeoCheckSchema>;
