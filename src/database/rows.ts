import type {QueryResult} from 'react-native-nitro-sqlite';
import type {SqlExecutor, SqlRow} from '../types';

export function rowsOf(result: QueryResult): SqlRow[] {
  return (result.rows?._array ?? []) as SqlRow[];
}

export function lastInsertId(executor: SqlExecutor): number {
  const rows = rowsOf(executor.execute('SELECT last_insert_rowid() AS id'));
  return Number(rows[0]?.id);
}
