import { asc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../../infrastructure/database/client.js';
import { recordAudit } from '../../audit/index.js';
import {
  DepartmentNameAlreadyExistsError,
  DepartmentNotFoundError,
  DepartmentInUseError,
  normalizeDepartmentName,
  type DepartmentRepository,
} from '../domain/department.js';
import { departments } from './schema.js';
function isDuplicateName(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    cause instanceof Error &&
    'code' in cause &&
    cause.code === '23505' &&
    'constraint' in cause &&
    cause.constraint === 'departments_name_normalized_unique'
  );
}
export function createDepartmentRepository(db: Database): DepartmentRepository {
  return {
    async create(input) {
      const name = normalizeDepartmentName(input.name);
      try {
        return await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(departments)
            .values({ name })
            .returning();
          if (!created)
            throw new Error('No se pudo recuperar el departamento creado.');
          await recordAudit(tx, {
            action: 'DEPARTMENT_CREATED',
            entityType: 'department',
            entityId: created.id,
            after: created,
          });
          return created;
        });
      } catch (error) {
        if (isDuplicateName(error))
          throw new DepartmentNameAlreadyExistsError();
        throw error;
      }
    },
    async update(id, input) {
      const name = normalizeDepartmentName(input.name);
      try {
        return await db.transaction(async (tx) => {
          const [before] = await tx
            .select()
            .from(departments)
            .where(eq(departments.id, id))
            .for('update');
          if (!before) throw new DepartmentNotFoundError();
          const [updated] = await tx
            .update(departments)
            .set({ name })
            .where(eq(departments.id, id))
            .returning();
          if (!updated) throw new DepartmentNotFoundError();
          await recordAudit(tx, {
            action: 'DEPARTMENT_UPDATED',
            entityType: 'department',
            entityId: id,
            before,
            after: updated,
          });
          return updated;
        });
      } catch (error) {
        if (isDuplicateName(error))
          throw new DepartmentNameAlreadyExistsError();
        throw error;
      }
    },
    async delete(id) {
      try {
        await db.transaction(async (tx) => {
          const [removed] = await tx
            .delete(departments)
            .where(eq(departments.id, id))
            .returning();
          if (!removed) throw new DepartmentNotFoundError();
          await recordAudit(tx, {
            action: 'DEPARTMENT_DELETED',
            entityType: 'department',
            entityId: id,
            before: removed,
          });
        });
      } catch (error) {
        const cause = error instanceof Error ? error.cause : undefined;
        if (cause instanceof Error && 'code' in cause && cause.code === '23503')
          throw new DepartmentInUseError();
        throw error;
      }
    },
    async list(ids) {
      return db
        .select()
        .from(departments)
        .where(
          ids === undefined ? undefined : inArray(departments.id, [...ids]),
        )
        .orderBy(asc(departments.name), asc(departments.id));
    },
  };
}
