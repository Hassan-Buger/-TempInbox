// Settings repository — key/value settings (default expiry, provider
// config, onboarding seen). Stored in SQLite so they survive app restarts.
import type { DbLike } from '../types';

export const SETTING_KEYS = {
  defaultExpiryMinutes: 'default_expiry_minutes',
  onboardingSeen: 'onboarding_seen',
  providerBaseUrl: 'provider_base_url',
  providerApiKey: 'provider_api_key',
  providerCreatePath: 'provider_create_path',
  providerListPath: 'provider_list_path',
  providerGetPath: 'provider_get_path',
  providerDeletePath: 'provider_delete_path',
} as const;

export async function getSetting(db: DbLike, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row ? row.value : null;
}

export async function setSetting(db: DbLike, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function getDefaultExpiryMinutes(db: DbLike): Promise<number> {
  const value = await getSetting(db, SETTING_KEYS.defaultExpiryMinutes);
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}
