import { Type, type Static } from 'typebox';

export const LivenessSchema = Type.Object(
  { status: Type.Literal('ok') },
  { additionalProperties: false },
);
export const ReadinessSchema = Type.Object(
  { status: Type.Literal('ok'), database: Type.Literal('ok') },
  { additionalProperties: false },
);
export const UnavailableSchema = Type.Object(
  {
    status: Type.Literal('unavailable'),
    database: Type.Literal('unavailable'),
  },
  { additionalProperties: false },
);
export const ErrorSchema = Type.Object(
  {
    error: Type.Object(
      { code: Type.String(), message: Type.String(), requestId: Type.String() },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
export type Readiness = Static<typeof ReadinessSchema>;

export {
  CreateDepartmentSchema,
  DepartmentSchema,
  DepartmentListSchema,
  type CreateDepartmentRequest,
  type DepartmentResponse,
  type DepartmentListResponse,
} from './departments.js';
export * from './identity.js';
export * from './employees.js';

export * from './audit.js';
export * from './planning.js';
export * from './locations.js';
export * from './attendance.js';
export * from './requests.js';
export * from './dashboard.js';
