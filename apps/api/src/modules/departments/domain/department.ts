export interface Department {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
}

export interface CreateDepartmentInput {
  readonly name: string;
}

export interface DepartmentRepository {
  create(input: CreateDepartmentInput): Promise<Department>;
  list(ids?: readonly string[]): Promise<Department[]>;
  update(id: string, input: CreateDepartmentInput): Promise<Department>;
  delete(id: string): Promise<void>;
}

export class InvalidDepartmentNameError extends Error {
  constructor() {
    super(
      'El nombre del departamento debe tener entre 1 y 100 caracteres y no contener caracteres nulos.',
    );
    this.name = 'InvalidDepartmentNameError';
  }
}

export class DepartmentNameAlreadyExistsError extends Error {
  constructor() {
    super('Ya existe un departamento con ese nombre.');
    this.name = 'DepartmentNameAlreadyExistsError';
  }
}

export function normalizeDepartmentName(name: string): string {
  const normalized = name.normalize('NFC').trim();
  const length = Array.from(normalized).length;
  if (length < 1 || length > 100 || normalized.includes('\u0000'))
    throw new InvalidDepartmentNameError();
  return normalized;
}

export class DepartmentNotFoundError extends Error {
  constructor() {
    super('Departamento no encontrado.');
    this.name = 'DepartmentNotFoundError';
  }
}
export class DepartmentInUseError extends Error {
  constructor() {
    super(
      'No se puede eliminar el departamento porque tiene empleados o responsabilidades vinculadas.',
    );
    this.name = 'DepartmentInUseError';
  }
}
