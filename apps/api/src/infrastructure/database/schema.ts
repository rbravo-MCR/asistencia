import { pgSchema } from 'drizzle-orm/pg-core';

// Espacio reservado a metadatos técnicos; no contiene entidades de negocio.
export const appMeta = pgSchema('app_meta');

// Registro de esquemas en la composición de persistencia, no entre módulos de negocio.
export { departments } from '../../modules/departments/infrastructure/schema.js';
export * from '../../modules/identity/schema.js';
export * from '../../modules/employees/schema.js';

export * from '../../modules/audit/schema.js';
export * from '../../modules/planning/schema.js';
export * from '../../modules/locations/schema.js';
export * from '../../modules/attendance/schema.js';
export * from '../../modules/requests/schema.js';
