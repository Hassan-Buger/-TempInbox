// Test-only SQLite adapter: runs the exact SQL from src/db against a real
// SQLite engine (Node 24's built-in node:sqlite, in-memory), wrapped in the
// same DbLike shape the repositories use in production (where the wrapper
// sits on expo-sqlite). This tests the SQL itself — migrations, constraints,
// cascades, deduplication — not a mock.
import { DatabaseSync } from 'node:sqlite';
import type { DbLike } from '../src/db/types';

export function createTestDb(): { db: DbLike; close: () => void } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  const db: DbLike = {
    execAsync: async (sql) => {
      raw.exec(sql);
    },
    runAsync: async (sql, params = []) => {
      const stmt = raw.prepare(sql);
      const info = stmt.run(...(params as never[]));
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: Number(info.changes) };
    },
    getAllAsync: async <T,>(sql: string, params: unknown[] = []) => {
      const stmt = raw.prepare(sql);
      return stmt.all(...(params as never[])) as T[];
    },
    getFirstAsync: async <T,>(sql: string, params: unknown[] = []) => {
      const stmt = raw.prepare(sql);
      const row = stmt.get(...(params as never[]));
      return (row ?? null) as T | null;
    },
  };
  return { db, close: () => raw.close() };
}
