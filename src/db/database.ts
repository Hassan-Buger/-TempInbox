// Database opening, foreign-key enforcement and migrations.
// Plain-English flow: open the file → turn foreign keys ON (SQLite has them
// OFF by default, so cascade deletes would silently not happen) → check the
// stored schema version → run any missing migrations, each in a transaction
// → record the new version. Called once at app startup (app/_layout.tsx).

import * as SQLite from 'expo-sqlite';
import type { DbLike } from './types';
import { migrate } from './migrate';

export { migrate } from './migrate';

const DB_NAME = 'tempinbox.db';

/** Wrap an expo-sqlite database in the DbLike shape repositories use. */
export function wrapExpoDb(db: SQLite.SQLiteDatabase): DbLike {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, ...(params as SQLite.SQLiteBindValue[])),
    getAllAsync: <T,>(sql: string, params: unknown[] = []) =>
      db.getAllAsync<T>(sql, ...(params as SQLite.SQLiteBindValue[])),
    getFirstAsync: <T,>(sql: string, params: unknown[] = []) =>
      db.getFirstAsync<T>(sql, ...(params as SQLite.SQLiteBindValue[])),
  };
}

let cached: DbLike | null = null;

/** Open (or reuse) the app database, with foreign keys on and migrations applied. */
export async function getDatabase(): Promise<DbLike> {
  if (cached) return cached;
  const raw = await SQLite.openDatabaseAsync(DB_NAME);
  // Foreign keys MUST be enabled on every connection, or ON DELETE CASCADE
  // in the schema does nothing.
  await raw.execAsync('PRAGMA foreign_keys = ON');
  const db = wrapExpoDb(raw);
  await migrate(db);
  cached = db;
  return db;
}
