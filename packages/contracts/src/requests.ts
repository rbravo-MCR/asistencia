import { Type, type Static } from 'typebox';
const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const Civil = Type.String({ format: 'date' });
const Text = Type.String({ minLength: 1, maxLength: 2000 });
const NullableId = Type.Union([Id, Type.Null()]);
const NullableInstant = Type.Union([Instant, Type.Null()]);
export const RequestKindSchema = Type.Union([
  Type.Literal('VACATION'),
  Type.Literal('PERMISSION'),
  Type.Literal('JUSTIFICATION'),
  Type.Literal('CANCELLATION'),
]);
export const RequestStatusSchema = Type.Union([
  Type.Literal('PENDING_HEAD'),
  Type.Literal('PENDING_DIRECTOR'),
  Type.Literal('APPROVED'),
  Type.Literal('REJECTED'),
  Type.Literal('WITHDRAWN'),
  Type.Literal('CANCELLED'),
]);
const policyFields = {
  name: Type.String({ minLength: 1, maxLength: 120 }),
  entitlements: Type.Array(
    Type.Object(
      {
        fromYear: Type.Integer({ minimum: 1, maximum: 100 }),
        days: Type.Integer({ minimum: 1, maximum: 365 }),
      },
      strict,
    ),
    { minItems: 1, maxItems: 100 },
  ),
  administrativeWeekdays: Type.Array(Type.Integer({ minimum: 1, maximum: 7 }), {
    minItems: 1,
    maxItems: 7,
    uniqueItems: true,
  }),
  operationalWeekdays: Type.Array(Type.Integer({ minimum: 1, maximum: 7 }), {
    minItems: 1,
    maxItems: 7,
    uniqueItems: true,
  }),
  excludeHolidays: Type.Boolean(),
};
export const LeavePolicyInputSchema = Type.Object(
  { ...policyFields, idempotencyKey: Id },
  strict,
);
export const LeavePolicySchema = Type.Object(
  { id: Id, version: Type.Integer(), ...policyFields, createdAt: Instant },
  strict,
);
const permissionFields = {
  name: Type.String({ minLength: 1, maxLength: 120 }),
  paid: Type.Boolean(),
  evidenceRequired: Type.Boolean(),
  allowPartial: Type.Boolean(),
  active: Type.Boolean(),
};
const noticeHours = Type.Integer({ minimum: 0, maximum: 8760 });
export const PermissionTypeInputSchema = Type.Object(
  {
    ...permissionFields,
    minimumNoticeHours: Type.Optional(noticeHours),
    partialOnly: Type.Optional(Type.Boolean()),
    idempotencyKey: Id,
  },
  strict,
);
export const PermissionTypeSchema = Type.Object(
  {
    id: Id,
    ...permissionFields,
    minimumNoticeHours: noticeHours,
    partialOnly: Type.Boolean(),
    version: Type.Integer(),
  },
  strict,
);
export const LeaveConfigurationSchema = Type.Object(
  {
    policy: Type.Union([LeavePolicySchema, Type.Null()]),
    permissionTypes: Type.Array(PermissionTypeSchema),
  },
  strict,
);
export const EvidenceInputSchema = Type.Object(
  {
    filename: Type.String({ minLength: 1, maxLength: 150 }),
    mimeType: Type.Union([
      Type.Literal('application/pdf'),
      Type.Literal('image/png'),
      Type.Literal('image/jpeg'),
    ]),
    contentBase64: Type.String({ minLength: 4, maxLength: 1398104 }),
  },
  strict,
);
export const EvidenceSchema = Type.Object(
  {
    id: Id,
    filename: Type.String(),
    mimeType: Type.String(),
    sizeBytes: Type.Integer(),
  },
  strict,
);
export const CreateRequestSchema = Type.Object(
  {
    kind: RequestKindSchema,
    reason: Text,
    idempotencyKey: Id,
    fromDate: Type.Optional(Civil),
    toDate: Type.Optional(Civil),
    vacationPeriodYear: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100 }),
    ),
    permissionTypeId: Type.Optional(Id),
    incidentId: Type.Optional(Id),
    originalRequestId: Type.Optional(Id),
    partialStartsAt: Type.Optional(Instant),
    partialEndsAt: Type.Optional(Instant),
    evidence: Type.Optional(Type.Array(EvidenceInputSchema, { maxItems: 3 })),
  },
  strict,
);
export const RequestDecisionInputSchema = Type.Object(
  {
    decision: Type.Union([Type.Literal('APPROVE'), Type.Literal('REJECT')]),
    reason: Text,
    idempotencyKey: Id,
  },
  strict,
);
export const RequestWithdrawInputSchema = Type.Object(
  { reason: Text, idempotencyKey: Id },
  strict,
);
export const RequestDecisionSchema = Type.Object(
  {
    id: Id,
    step: Type.Union([Type.Literal('HEAD'), Type.Literal('DIRECTOR')]),
    decision: Type.Union([Type.Literal('APPROVE'), Type.Literal('REJECT')]),
    reason: Text,
    actorId: Id,
    actorName: Type.String(),
    assignmentId: NullableId,
    createdAt: Instant,
  },
  strict,
);
export const LeaveRequestSchema = Type.Object(
  {
    id: Id,
    kind: RequestKindSchema,
    status: RequestStatusSchema,
    approvalFlow: Type.Optional(
      Type.Union([Type.Literal('HEAD_ONLY'), Type.Literal('HEAD_DIRECTOR')]),
    ),
    employeeId: Id,
    employeeName: Type.String(),
    departmentId: Id,
    reason: Text,
    fromDate: Civil,
    toDate: Civil,
    partialStartsAt: NullableInstant,
    partialEndsAt: NullableInstant,
    vacationPeriodYear: Type.Union([Type.Integer(), Type.Null()]),
    days: Type.Integer(),
    chargedDates: Type.Array(Civil),
    permissionTypeId: NullableId,
    permissionTypeName: Type.Union([Type.String(), Type.Null()]),
    paid: Type.Union([Type.Boolean(), Type.Null()]),
    incidentId: NullableId,
    originalRequestId: NullableId,
    policyVersion: Type.Union([Type.Integer(), Type.Null()]),
    createdAt: Instant,
    resolvedAt: NullableInstant,
    withdrawal: Type.Optional(
      Type.Union([
        Type.Object({ reason: Text, actorId: Id, createdAt: Instant }, strict),
        Type.Null(),
      ]),
    ),
    decisions: Type.Array(RequestDecisionSchema),
    evidence: Type.Array(EvidenceSchema),
    canHeadDecide: Type.Boolean(),
    canDirectorDecide: Type.Boolean(),
    canWithdraw: Type.Boolean(),
    canCancel: Type.Boolean(),
  },
  strict,
);
export const LeaveRequestListSchema = Type.Object(
  { items: Type.Array(LeaveRequestSchema) },
  strict,
);
export const VacationGrantInputSchema = Type.Object(
  {
    employeeId: Id,
    anniversaryYear: Type.Integer({ minimum: 1, maximum: 100 }),
    reason: Text,
    idempotencyKey: Id,
  },
  strict,
);
export const VacationAdjustmentInputSchema = Type.Object(
  {
    employeeId: Id,
    anniversaryYear: Type.Integer({ minimum: 1, maximum: 100 }),
    days: Type.Integer({ minimum: -365, maximum: 365 }),
    reason: Text,
    idempotencyKey: Id,
  },
  strict,
);
export const VacationMovementSchema = Type.Object(
  {
    id: Id,
    employeeId: Id,
    anniversaryYear: Type.Integer(),
    kind: Type.String(),
    balanceDelta: Type.Integer(),
    reservedDelta: Type.Integer(),
    reason: Text,
    requestId: NullableId,
    createdAt: Instant,
  },
  strict,
);
export const VacationBalanceSchema = Type.Object(
  {
    employeeId: Id,
    employeeName: Type.String(),
    anniversaryYear: Type.Integer(),
    entitlement: Type.Integer(),
    balance: Type.Integer(),
    reserved: Type.Integer(),
    available: Type.Integer(),
    approvedDays: Type.Integer(),
    enjoyedDays: Type.Integer(),
    movements: Type.Array(VacationMovementSchema),
  },
  strict,
);
export const VacationBalanceListSchema = Type.Object(
  { items: Type.Array(VacationBalanceSchema) },
  strict,
);
export type LeavePolicyInput = Static<typeof LeavePolicyInputSchema>;
export type LeavePolicyView = Static<typeof LeavePolicySchema>;
export type PermissionTypeInput = Static<typeof PermissionTypeInputSchema>;
export type PermissionTypeView = Static<typeof PermissionTypeSchema>;
export type CreateRequestInput = Static<typeof CreateRequestSchema>;
export type RequestDecisionInput = Static<typeof RequestDecisionInputSchema>;
export type RequestWithdrawInput = Static<typeof RequestWithdrawInputSchema>;
export type LeaveRequestView = Static<typeof LeaveRequestSchema>;
export type VacationGrantInput = Static<typeof VacationGrantInputSchema>;
export type VacationAdjustmentInput = Static<
  typeof VacationAdjustmentInputSchema
>;
export type VacationBalanceView = Static<typeof VacationBalanceSchema>;
export type EvidenceInput = Static<typeof EvidenceInputSchema>;
