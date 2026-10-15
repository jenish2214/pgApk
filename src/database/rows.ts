import type {QueryResult} from 'react-native-nitro-sqlite';
import type {SqlExecutor, SqlRow} from '../types';

export function rowsOf(result: QueryResult): SqlRow[] {
  return (result.rows?._array ?? []) as SqlRow[];
}

export function lastInsertId(executor: SqlExecutor): number {
  const rows = rowsOf(executor.execute('SELECT last_insert_rowid() AS id'));
  return Number(rows[0]?.id);
}

/** Groups child rows by their parent id after one list query. */
export function groupByParent<T>(
  rows: SqlRow[],
  parentKey: string,
  map: (row: SqlRow) => T,
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  rows.forEach(row => {
    const id = Number(row[parentKey]);
    const item = map(row);
    const current = groups.get(id);
    if (current) {
      current.push(item);
    } else {
      groups.set(id, [item]);
    }
  });
  return groups;
}
