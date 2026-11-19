import { Type, type Static } from 'typebox';
const Id = Type.String({ format: 'uuid' });
const Instant = Type.String({ format: 'date-time' });
const Roles = Type.Array(
  Type.Union([
    Type.Literal('SUPER_ADMIN'),
    Type.Literal('ADMIN'),
    Type.Literal('HR'),
    Type.Literal('EMPLOYEE'),
  ]),
  { minItems: 1, maxItems: 4, uniqueItems: true },
);
const Password = Type.String({ minLength: 6, maxLength: 256 });
const Email = Type.String({ format: 'email', maxLength: 254 });
const Name = Type.String({ minLength: 1 });
const strict = { additionalProperties: false };
const LoginPassword = Type.String({ minLength: 1, maxLength: 256 });
export const LoginSchema = Type.Union([
  Type.Object(
    {
      identifier: Type.String({ minLength: 1, maxLength: 254 }),
      password: LoginPassword,
    },
    strict,
  ),
  // Compatibilidad con clientes que todavía envían correo.
  Type.Object({ email: Email, password: LoginPassword }, strict),
]);
export const UserSchema = Type.Object(
  {
    id: Id,
    email: Email,
    name: Name,
    roles: Roles,
    active: Type.Boolean(),
    createdAt: Instant,
  },
  strict,
);
export const UserListSchema = Type.Object(
  { items: Type.Array(UserSchema) },
  strict,
);
export const UserInputSchema = Type.Object(
  {
    email: Email,
    name: Name,
    roles: Roles,
    active: Type.Boolean(),
    password: Password,
  },
  strict,
);
export const UserUpdateSchema = Type.Object(
  { email: Email, name: Name, roles: Roles, active: Type.Boolean() },
  strict,
);
export const UserDirectorySchema = Type.Object(
  {
    items: Type.Array(
      Type.Object(
        { id: Id, email: Email, name: Name, active: Type.Boolean() },
        strict,
      ),
    ),
  },
  strict,
);
export const SessionSchema = Type.Object(
  {
    user: UserSchema,
    csrfToken: Type.String(),
    expiresAt: Instant,
    employeeId: Type.Union([Id, Type.Null()]),
    departmentIds: Type.Array(Id),
    managedDepartmentIds: Type.Array(Id),
    permissions: Type.Object(
      {
        manageUsers: Type.Boolean(),
        manageOrganization: Type.Boolean(),
        viewAllEmployees: Type.Boolean(),
      },
      strict,
    ),
  },
  strict,
);
export const RecoverySchema = Type.Object(
  { token: Type.String({ minLength: 1, maxLength: 128 }), password: Password },
  strict,
);
export const RecoveryTokenSchema = Type.Object(
  { token: Type.String(), expiresAt: Instant },
  strict,
);
export const ChangePasswordSchema = Type.Object(
  {
    currentPassword: Type.String({ minLength: 1, maxLength: 256 }),
    password: Password,
  },
  strict,
);
export const IdParamsSchema = Type.Object({ id: Id }, strict);
export type UserView = Static<typeof UserSchema>;
export type UserInput = Static<typeof UserInputSchema>;
export type UserUpdate = Static<typeof UserUpdateSchema>;
export type SessionView = Static<typeof SessionSchema>;
export type RecoveryToken = Static<typeof RecoveryTokenSchema>;
