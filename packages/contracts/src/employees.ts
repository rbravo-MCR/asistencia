import { Type, type Static } from 'typebox';
const Id = Type.String({ format: 'uuid' });
const NullableId = Type.Union([Id, Type.Null()]);
const Instant = Type.String({ format: 'date-time' });
const NullableInstant = Type.Union([Instant, Type.Null()]);
const Text = Type.String({ minLength: 1 });
const strict = { additionalProperties: false };
const fields = {
  employeeNumber: Text,
  fullName: Text,
  phoneNumber: Type.Union([
    Type.String({ pattern: '^[+]?[0-9]{7,15}$' }),
    Type.Null(),
  ]),
  address: Type.Union([
    Type.String({ minLength: 1, maxLength: 500 }),
    Type.Null(),
  ]),
  departmentId: Id,
  position: Text,
  joinedOn: Type.String({ format: 'date' }),
  category: Type.Union([
    Type.Literal('ADMINISTRATIVE'),
    Type.Literal('OPERATIONAL'),
  ]),
  status: Type.Union([Type.Literal('ACTIVE'), Type.Literal('INACTIVE')]),
  supervisorId: NullableId,
  userId: NullableId,
};
const contactInputFields = {
  phoneNumber: Type.Optional(
    Type.Union([Type.String({ maxLength: 64 }), Type.Null()]),
  ),
  address: Type.Optional(Type.Union([Type.String(), Type.Null()])),
};
export const EmployeeInputSchema = Type.Object(
  { ...fields, ...contactInputFields },
  strict,
);
export const EmployeeCreateInputSchema = Type.Object(
  { ...fields, ...contactInputFields, employeeNumber: Type.Optional(Text) },
  strict,
);
export const EmployeeSchema = Type.Object(
  { id: Id, ...fields, createdAt: Instant, updatedAt: Instant },
  strict,
);
export const EmployeeListSchema = Type.Object(
  { items: Type.Array(EmployeeSchema) },
  strict,
);
export const AssignmentInputSchema = Type.Object(
  {
    kind: Type.Union([
      Type.Literal('HEAD'),
      Type.Literal('DIRECTOR'),
      Type.Literal('SUBSTITUTE'),
    ]),
    employeeId: Id,
    departmentId: NullableId,
    startsAt: Type.Optional(Instant),
    endsAt: Type.Optional(NullableInstant),
    reason: Text,
  },
  strict,
);
export const AssignmentSchema = Type.Object(
  {
    id: Id,
    kind: Type.Union([
      Type.Literal('HEAD'),
      Type.Literal('DIRECTOR'),
      Type.Literal('SUBSTITUTE'),
    ]),
    employeeId: Id,
    departmentId: NullableId,
    startsAt: Instant,
    endsAt: NullableInstant,
    sourceAssignmentId: NullableId,
    reason: Text,
    createdBy: Id,
    revokedAt: NullableInstant,
  },
  strict,
);
export const AssignmentListSchema = Type.Object(
  { items: Type.Array(AssignmentSchema) },
  strict,
);
export type EmployeeInput = Static<typeof EmployeeInputSchema>;
export type EmployeeCreateInput = Static<typeof EmployeeCreateInputSchema>;
export type EmployeeView = Static<typeof EmployeeSchema>;
export type AssignmentInput = Static<typeof AssignmentInputSchema>;
export type AssignmentView = Static<typeof AssignmentSchema>;
