import type pg from 'pg';
export async function dropRestoreDatabase(
  control: Pick<pg.Pool, 'query'>,
  name: string,
) {
  if (!/^restore_[a-f0-9]{32}_test$/.test(name))
    throw new Error('Base temporal inválida.');
  await control.query(`drop database "${name}" with (force)`);
}
