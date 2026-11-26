// Schema — the database design, from REQUIREMENTS.md §12 / FULL_BUILD_PROMPT §7.
// Tables:
//   mailboxes — one row per temporary address the user created.
//   messages  — one row per email received for a mailbox.
//   settings  — key/value app settings (default expiry, provider config).
// Schema version is stored with PRAGMA user_version (starts at 1).
// Migrations are ordered functions; each runs inside one transaction.

export const SCHEMA_VERSION = 1;

const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS mailboxes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  address       TEXT    NOT NULL UNIQUE,
  provider_ref  TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  status        TEXT    NOT NULL CHECK (status IN ('active','expired','deleted')),
  CHECK (expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS messages (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  mailbox_id          INTEGER NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  provider_message_id TEXT    NOT NULL,
  from_address        TEXT    NOT NULL,
  subject             TEXT    NOT NULL DEFAULT '',
  received_at         INTEGER NOT NULL,
  body_text           TEXT    NOT NULL DEFAULT '',
  body_html_clean     TEXT,
  is_read             INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  fetched_at          INTEGER NOT NULL,
  UNIQUE (mailbox_id, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_mailbox_received
  ON messages(mailbox_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailboxes_status_expires
  ON mailboxes(status, expires_at);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// Migrations run in order; index 0 is version 1.
export const MIGRATIONS: string[] = [MIGRATION_V1];
