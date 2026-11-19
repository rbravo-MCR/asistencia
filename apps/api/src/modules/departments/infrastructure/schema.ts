import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
      precision: 3,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'departments_name_length',
      sql`char_length(${table.name}) between 1 and 100`,
    ),
    // La lista de btrim equivale a los espacios que elimina String.prototype.trim.
    check(
      'departments_name_canonical',
      sql`${table.name} = normalize(btrim(${table.name}, U&'\\0009\\000A\\000B\\000C\\000D\\0020\\00A0\\1680\\2000\\2001\\2002\\2003\\2004\\2005\\2006\\2007\\2008\\2009\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF'), NFC)`,
    ),
    uniqueIndex('departments_name_normalized_unique').on(
      sql`lower(btrim(${table.name}))`,
    ),
  ],
);
