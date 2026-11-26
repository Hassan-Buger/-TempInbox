// DbLike — the small interface every repository talks to.
// Why it exists: expo-sqlite's SQLiteDatabase has these same methods, but
// its signatures take parameters as spread arguments, while tests need to
// run the exact same SQL against node:sqlite. Both are wrapped into this
// one shape (see database.ts and tests/dbAdapter.ts), so the SQL in the
// repositories is tested against a real SQLite engine, not a mock.
export interface DbLike {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    params?: unknown[],
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}
