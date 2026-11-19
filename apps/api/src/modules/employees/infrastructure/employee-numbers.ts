import { sql } from 'drizzle-orm';
import type { Database } from '../../../infrastructure/database/client.js';

/** Reserva un número persistente; admite Database o la transacción del alta. */
export async function generateEmployeeNumber(
  db: Pick<Database, 'execute'>,
): Promise<string> {
  const result = await db.execute<{ employee_number: string }>(sql`
    with candidate as (
      select coalesce(max(case
        when btrim(employee_number) ~ '^[0-9]+$'
        then btrim(employee_number)::numeric
      end), 0) + 1 as value
      from employees
    )
    insert into employee_number_counter (id, last_value)
    select 1, case when value = 999999 then 1000000 else value end
    from candidate
    on conflict (id) do update set last_value = case
      when greatest(employee_number_counter.last_value + 1, excluded.last_value) = 999999
      then 1000000
      else greatest(employee_number_counter.last_value + 1, excluded.last_value)
    end
    returning last_value::text as employee_number
  `);
  const [row] = result.rows;
  if (!row) throw new Error('No se pudo generar el número de empleado.');
  return row.employee_number.padStart(6, '0');
}
