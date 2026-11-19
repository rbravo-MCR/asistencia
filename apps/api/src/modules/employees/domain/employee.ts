export interface EmployeeInput {
  employeeNumber: string;
  fullName: string;
  phoneNumber?: string | null;
  address?: string | null;
  departmentId: string;
  position: string;
  joinedOn: string;
  category: 'ADMINISTRATIVE' | 'OPERATIONAL';
  status: 'ACTIVE' | 'INACTIVE';
  supervisorId: string | null;
  userId: string | null;
}
export class OrganizationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganizationError';
  }
}
function text(value: string, maximum: number, field: string): string {
  const result = value.normalize('NFC').trim();
  if (
    !result ||
    Array.from(result).length > maximum ||
    result.includes('\u0000')
  )
    throw new OrganizationError('INVALID_EMPLOYEE', `${field} inválido.`);
  return result;
}
function normalizePhone(value: string | null): string | null {
  if (value === null || !value.trim()) return null;
  const raw = value.trim();
  const normalized = raw.replace(/[\s().-]/g, '');
  if (
    raw.length > 64 ||
    !/^\+?[0-9\s().-]+$/.test(raw) ||
    !/^\+?[0-9]{7,15}$/.test(normalized)
  )
    throw new OrganizationError(
      'INVALID_EMPLOYEE',
      'El celular debe contener entre 7 y 15 dígitos; puede incluir + al inicio.',
    );
  return normalized;
}
export function normalizeEmployeeInput(input: EmployeeInput): EmployeeInput {
  const date = new Date(`${input.joinedOn}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.joinedOn) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.joinedOn
  )
    throw new OrganizationError(
      'INVALID_EMPLOYEE',
      'Fecha de ingreso inválida.',
    );
  if (
    !['ACTIVE', 'INACTIVE'].includes(input.status) ||
    !['ADMINISTRATIVE', 'OPERATIONAL'].includes(input.category)
  )
    throw new OrganizationError(
      'INVALID_EMPLOYEE',
      'Categoría o estado inválido.',
    );
  const employeeNumber = text(input.employeeNumber, 30, 'Número interno');
  if (/^0*999999$/.test(employeeNumber))
    throw new OrganizationError(
      'INVALID_EMPLOYEE',
      'El número 999999 está reservado para el administrador.',
    );
  return {
    ...input,
    employeeNumber,
    fullName: text(input.fullName, 150, 'Nombre'),
    ...(input.phoneNumber !== undefined
      ? { phoneNumber: normalizePhone(input.phoneNumber) }
      : {}),
    ...(input.address !== undefined
      ? {
          address:
            input.address === null || !input.address.trim()
              ? null
              : text(input.address, 500, 'Dirección'),
        }
      : {}),
    position: text(input.position, 120, 'Puesto'),
  };
}
export interface OrganizationScope {
  employeeId: string | null;
  departmentIds: string[];
  managedDepartmentIds: string[];
  isDirector: boolean;
}
