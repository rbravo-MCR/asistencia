import { Type, type Static } from 'typebox';

// El límite semántico se aplica en dominio después de NFC/trim.
// JSON Schema valida aquí forma, blancos y ausencia de caracteres nulos.
const namePattern = '^(?!\\s*$)[^\\u0000]+$';
const DepartmentNameInputSchema = Type.String({
  minLength: 1,
  pattern: namePattern,
});
const DepartmentNameSchema = Type.String({
  minLength: 1,
  maxLength: 100,
  pattern: namePattern,
});

export const CreateDepartmentSchema = Type.Object(
  { name: DepartmentNameInputSchema },
  { additionalProperties: false },
);
export const DepartmentSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    name: DepartmentNameSchema,
    createdAt: Type.String({
      format: 'date-time',
      pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$',
    }),
  },
  { additionalProperties: false },
);
export const DepartmentListSchema = Type.Object(
  { items: Type.Array(DepartmentSchema) },
  { additionalProperties: false },
);
export type CreateDepartmentRequest = Static<typeof CreateDepartmentSchema>;
export type DepartmentResponse = Static<typeof DepartmentSchema>;
export type DepartmentListResponse = Static<typeof DepartmentListSchema>;
