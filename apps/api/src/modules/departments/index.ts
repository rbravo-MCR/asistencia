export { createDepartmentRepository } from './infrastructure/repository.js';
export {
  DepartmentNameAlreadyExistsError,
  DepartmentNotFoundError,
  DepartmentInUseError,
  InvalidDepartmentNameError,
  type Department,
  type CreateDepartmentInput,
  type DepartmentRepository,
} from './domain/department.js';
export { registerDepartmentRoutes } from './http/routes.js';
