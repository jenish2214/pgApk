import {open, type NitroSQLiteConnection} from 'react-native-nitro-sqlite';
import type {SqlExecutor} from '../types';
import {migrate} from './migrations';
import {rowsOf} from './rows';

let database: NitroSQLiteConnection | undefined;

export function initDatabase(): NitroSQLiteConnection {
  if (!database) {
    database = open({name: 'pragati_gold.sqlite'});
    database.execute('PRAGMA foreign_keys = ON');
  }
  return database;
}

export function getDatabase(): NitroSQLiteConnection {
  if (!database) {
    throw new Error('Shop records are not ready yet.');
  }
  return database;
}

export async function prepareDatabase(): Promise<NitroSQLiteConnection> {
  const db = initDatabase();
  await migrate(db);
  return db;
}

export function withTransaction<T>(work: (tx: SqlExecutor) => T): Promise<T> {
  return getDatabase().transaction(async tx => work(tx));
}

export function getMeta(key: string, fallback = ''): string {
  const rows = rowsOf(
    getDatabase().execute('SELECT value FROM app_meta WHERE key = ?', [key]),
  );
  const value = rows[0]?.value;
  return value == null || value === '' ? fallback : String(value);
}

export function hasFinishedOnboarding(): boolean {
  const rows = rowsOf(
    getDatabase().execute('SELECT value FROM app_meta WHERE key = ?', [
      'onboarding_complete',
    ]),
  );
  return rows[0]?.value === '1';
}

export function finishOnboarding(): void {
  getDatabase().execute(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ['onboarding_complete', '1'],
  );
}
