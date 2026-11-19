import { Type, type Static } from 'typebox';
const strict = { additionalProperties: false };
const Id = Type.String({ format: 'uuid' });
const Day = Type.String({ format: 'date' });
const Instant = Type.String({ format: 'date-time' });
const NullableInstant = Type.Union([Instant, Type.Null()]);
const Name = Type.String({ minLength: 1, maxLength: 150 });
const fields = {
  name: Name,
  category: Type.Union([
    Type.Literal('ADMINISTRATIVE'),
    Type.Literal('OPERATIONAL'),
  ]),
  modality: Type.Union([Type.Literal('ONSITE'), Type.Literal('HOME_OFFICE')]),
  startTime: Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }),
  endTime: Type.String({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }),
  weekdays: Type.Array(Type.Integer({ minimum: 1, maximum: 7 }), {
    minItems: 1,
    maxItems: 7,
    uniqueItems: true,
  }),
  timeZone: Type.String({ minLength: 1, maxLength: 100 }),
  active: Type.Boolean(),
};
export const ShiftTemplateInputSchema = Type.Object(fields, strict);
export const ShiftTemplateSchema = Type.Object(
  { id: Id, ...fields, version: Type.Integer({ minimum: 1 }) },
  strict,
);
export const ShiftTemplateListSchema = Type.Object(
  { items: Type.Array(ShiftTemplateSchema) },
  strict,
);
export const HolidayInputSchema = Type.Object(
  { name: Name, date: Day },
  strict,
);
export const HolidaySchema = Type.Object(
  { id: Id, name: Name, date: Day },
  strict,
);
export const HolidayListSchema = Type.Object(
  { items: Type.Array(HolidaySchema) },
  strict,
);
const assignmentFields = {
  employeeId: Id,
  templateId: Id,
  workDate: Day,
  kind: Type.Union([Type.Literal('REGULAR'), Type.Literal('DUTY')]),
  locationId: Type.Union([Id, Type.Null()]),
};
export const ScheduleAssignmentInputSchema = Type.Object(
  {
    ...assignmentFields,
    locationId: Type.Optional(assignmentFields.locationId),
  },
  strict,
);
export const ScheduleAssignmentSchema = Type.Object(
  {
    id: Id,
    ...assignmentFields,
    templateVersion: Type.Integer(),
    startsAt: Instant,
    endsAt: Instant,
    modality: fields.modality,
    timeZone: fields.timeZone,
    templateName: Name,
    status: Type.Union([
      Type.Literal('DRAFT'),
      Type.Literal('PUBLISHED'),
      Type.Literal('CANCELLED'),
    ]),
    publishedAt: NullableInstant,
    cancelledAt: NullableInstant,
    cancellationReason: Type.Union([Type.String(), Type.Null()]),
    snapshot: Type.Object({ ...fields, version: Type.Integer() }, strict),
  },
  strict,
);
export const ScheduleAssignmentListSchema = Type.Object(
  { items: Type.Array(ScheduleAssignmentSchema) },
  strict,
);
export const CalendarQuerySchema = Type.Object({ from: Day, to: Day }, strict);
export const CancelScheduleAssignmentSchema = Type.Object(
  { reason: Type.String({ minLength: 1, maxLength: 500 }) },
  strict,
);
export type ShiftTemplateInput = Static<typeof ShiftTemplateInputSchema>;
export type ShiftTemplateView = Static<typeof ShiftTemplateSchema>;
export type HolidayInput = Static<typeof HolidayInputSchema>;
export type HolidayView = Static<typeof HolidaySchema>;
export type ScheduleAssignmentInput = Static<
  typeof ScheduleAssignmentInputSchema
>;
export type ScheduleAssignmentView = Static<typeof ScheduleAssignmentSchema>;
