// Migrations — kept in its own module with NO native imports, so tests can
// import it without loading expo-sqlite (which Jest cannot load).
// database.ts wraps this with the real expo-sqlite connection.
import type { DbLike } from './types';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';

/** Run all pending migrations against a DbLike. Each runs in a transaction. */
export async function migrate(db: DbLike): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current + 1; version <= SCHEMA_VERSION; version++) {
    const sql = MIGRATIONS[version - 1];
    await db.execAsync('BEGIN TRANSACTION');
    try {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${version}`);
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }
}
