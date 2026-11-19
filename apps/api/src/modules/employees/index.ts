export {
  createEmployeeService,
  type EmployeeService,
} from './application/service.js';
export { OrganizationError } from './domain/employee.js';
export { registerEmployeeRoutes } from './http/routes.js';
export { generateEmployeeNumber } from './infrastructure/employee-numbers.js';
