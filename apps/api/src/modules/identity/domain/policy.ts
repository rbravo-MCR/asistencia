export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'EMPLOYEE';
export class IdentityError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
export function normalizeEmail(value: string): string {
  const email = value.normalize('NFC').trim().toLowerCase();
  if (
    email.includes('\u0000') ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new IdentityError('INVALID_USER', 'Correo electrónico inválido.');
  return email;
}
export function validatePassword(value: string): void {
  const length = Array.from(value).length;
  if (length < 6 || length > 128)
    throw new IdentityError(
      'INVALID_USER',
      'La contraseña debe tener entre 6 y 128 caracteres.',
    );
}
export function normalizeUserName(value: string): string {
  const name = value.normalize('NFC').trim();
  if (!name || Array.from(name).length > 150 || name.includes('\u0000'))
    throw new IdentityError('INVALID_USER', 'Nombre de usuario inválido.');
  return name;
}
export function validateRoles(values: Role[]): Role[] {
  if (
    !values.length ||
    values.length > 4 ||
    new Set(values).size !== values.length ||
    values.some(
      (value) => !['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'].includes(value),
    )
  )
    throw new IdentityError('INVALID_USER', 'Roles inválidos.');
  return values;
}
