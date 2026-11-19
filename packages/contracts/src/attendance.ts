import { Type, type Static } from 'typebox';
const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const nullableId = Type.Union([Id, Type.Null()]);
const nullableText = Type.Union([Type.String(), Type.Null()]);
const reason = Type.String({ minLength: 1, maxLength: 2000 });
const policyFields = {
  lateToleranceMinutes: Type.Integer({ minimum: 0, maximum: 120 }),
  earlyEntryMinutes: Type.Integer({ minimum: 0, maximum: 1440 }),
  lateExitMinutes: Type.Integer({ minimum: 0, maximum: 1440 }),
  administrativeAbsenceMinutes: Type.Optional(
    Type.Union([Type.Integer({ minimum: 1, maximum: 1440 }), Type.Null()]),
  ),
};
export const AttendancePolicyInputSchema = Type.Object(policyFields, strict);
export const AttendancePolicySchema = Type.Object(
  {
    id: Id,
    version: Type.Integer(),
    ...policyFields,
    activatedAt: Instant,
    createdAt: Instant,
  },
  strict,
);
export const AttendanceRangeSchema = Type.Object(
  {
    from: Type.String({ format: 'date' }),
    to: Type.String({ format: 'date' }),
  },
  strict,
);
export const AttendancePunchInputSchema = Type.Object(
  {
    assignmentId: Id,
    direction: Type.Union([Type.Literal('ENTRY'), Type.Literal('EXIT')]),
    idempotencyKey: Id,
    latitude: Type.Optional(Type.Number({ minimum: -90, maximum: 90 })),
    longitude: Type.Optional(Type.Number({ minimum: -180, maximum: 180 })),
    accuracy: Type.Optional(Type.Number({ minimum: 0 })),
    reason: Type.Optional(reason),
  },
  strict,
);
export const AttendanceReasonInputSchema = Type.Object({ reason }, strict);
export const AttendanceReasonSchema = Type.Object(
  { id: Id, reason, createdAt: Instant },
  strict,
);
export const AttendanceIncidentSchema = Type.Object(
  {
    id: Id,
    sessionId: Id,
    assignmentId: Id,
    employeeId: Id,
    kind: Type.String(),
    createdAt: Instant,
    requiresReason: Type.Boolean(),
    resolution: Type.Optional(
      Type.Union([
        Type.Object({ requestId: Id, decidedAt: Instant }, strict),
        Type.Null(),
      ]),
    ),
    reasons: Type.Array(AttendanceReasonSchema),
  },
  strict,
);
export const AttendanceAttemptSchema = Type.Object(
  {
    id: Id,
    sessionId: Id,
    assignmentId: Id,
    employeeId: Id,
    direction: Type.Union([Type.Literal('ENTRY'), Type.Literal('EXIT')]),
    recordedAt: Instant,
    accepted: Type.Boolean(),
    rejectionCode: nullableText,
    geoCheckId: nullableId,
  },
  strict,
);
export const AttendanceEvaluationSchema = Type.Object(
  { id: Id, evaluatedAt: Instant, result: Type.String() },
  strict,
);
export const AttendancePunchResultSchema = Type.Object(
  {
    attempt: AttendanceAttemptSchema,
    incidents: Type.Array(AttendanceIncidentSchema),
    requiresReason: Type.Boolean(),
  },
  strict,
);
export const AttendanceSummaryItemSchema = Type.Object(
  {
    assignmentId: Id,
    employeeId: Id,
    employeeName: Type.String(),
    workDate: Type.String({ format: 'date' }),
    startsAt: Instant,
    endsAt: Instant,
    modality: Type.Union([Type.Literal('ONSITE'), Type.Literal('HOME_OFFICE')]),
    status: Type.String(),
    timeZone: Type.String(),
    sessionId: nullableId,
    policy: Type.Union([AttendancePolicySchema, Type.Null()]),
    attempts: Type.Array(AttendanceAttemptSchema),
    incidents: Type.Array(AttendanceIncidentSchema),
    evaluations: Type.Array(AttendanceEvaluationSchema),
    summary: Type.String(),
  },
  strict,
);
export const AttendanceSummarySchema = Type.Object(
  { items: Type.Array(AttendanceSummaryItemSchema) },
  strict,
);
export const AttendanceIncidentListSchema = Type.Object(
  { items: Type.Array(AttendanceIncidentSchema) },
  strict,
);
export const AttendanceEvaluateResultSchema = Type.Object(
  { evaluated: Type.Integer() },
  strict,
);
export type AttendancePolicyInput = Static<typeof AttendancePolicyInputSchema>;
export type AttendancePolicyView = Static<typeof AttendancePolicySchema>;
export type AttendancePunchInput = Static<typeof AttendancePunchInputSchema>;
export type AttendancePunchResult = Static<typeof AttendancePunchResultSchema>;
export type AttendanceIncidentView = Static<typeof AttendanceIncidentSchema>;
export type AttendanceSummaryItem = Static<typeof AttendanceSummaryItemSchema>;
export type AttendanceSummary = Static<typeof AttendanceSummarySchema>;

export const AttendanceMeSchema = Type.Object(
  {
    employee: Type.Union([
      Type.Object(
        {
          id: Id,
          employeeNumber: Type.String(),
          fullName: Type.String(),
          category: Type.Union([
            Type.Literal('ADMINISTRATIVE'),
            Type.Literal('OPERATIONAL'),
          ]),
          status: Type.Union([
            Type.Literal('ACTIVE'),
            Type.Literal('INACTIVE'),
          ]),
        },
        strict,
      ),
      Type.Null(),
    ]),
    serverTime: Instant,
    policy: AttendancePolicySchema,
    pendingIncidents: Type.Array(AttendanceIncidentSchema),
    items: Type.Array(AttendanceSummaryItemSchema),
  },
  strict,
);
export type AttendanceMe = Static<typeof AttendanceMeSchema>;
