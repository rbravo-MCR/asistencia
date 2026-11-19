import {
  normalizeDepartmentName,
  type CreateDepartmentInput,
  type Department,
  type DepartmentRepository,
} from '../domain/department.js';

export function createDepartment(
  repository: DepartmentRepository,
  input: CreateDepartmentInput,
): Promise<Department> {
  return repository.create({ name: normalizeDepartmentName(input.name) });
}

export function listDepartments(
  repository: DepartmentRepository,
  ids?: readonly string[],
): Promise<Department[]> {
  return repository.list(ids);
}

export function updateDepartment(
  repository: DepartmentRepository,
  id: string,
  input: CreateDepartmentInput,
): Promise<Department> {
  return repository.update(id, { name: normalizeDepartmentName(input.name) });
}
export function deleteDepartment(
  repository: DepartmentRepository,
  id: string,
): Promise<void> {
  return repository.delete(id);
}
