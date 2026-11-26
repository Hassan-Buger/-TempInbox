// Address repository — all SQL about mailboxes lives here, nowhere else.
// Every user/provider value is bound with a `?` placeholder (never pasted
// into the SQL string), so a strange address can never break or inject SQL.
import type { DbLike } from '../types';
import type { Mailbox } from '../../types';
import { isExpired } from '../../utils/time';

interface MailboxRow {
  id: number;
  address: string;
  provider_ref: string;
  created_at: number;
  expires_at: number;
  status: string;
  message_count: number;
  unread_count: number;
}

function toMailbox(row: MailboxRow): Mailbox {
  return {
    id: row.id,
    address: row.address,
    providerRef: row.provider_ref,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: row.status as Mailbox['status'],
    messageCount: row.message_count,
    unreadCount: row.unread_count,
  };
}

const LIST_SQL = `
  SELECT m.*,
    (SELECT COUNT(*) FROM messages WHERE mailbox_id = m.id) AS message_count,
    (SELECT COUNT(*) FROM messages WHERE mailbox_id = m.id AND is_read = 0) AS unread_count
  FROM mailboxes m
`;

export async function createMailbox(
  db: DbLike,
  input: { address: string; providerRef: string; createdAt: number; expiresAt: number },
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO mailboxes (address, provider_ref, created_at, expires_at, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [input.address, input.providerRef, input.createdAt, input.expiresAt],
  );
  return result.lastInsertRowId;
}

export async function listMailboxes(db: DbLike): Promise<Mailbox[]> {
  const rows = await db.getAllAsync<MailboxRow>(
    `${LIST_SQL} ORDER BY created_at DESC`,
  );
  return rows.map(toMailbox);
}

export async function getMailbox(db: DbLike, id: number): Promise<Mailbox | null> {
  const row = await db.getFirstAsync<MailboxRow>(`${LIST_SQL} WHERE m.id = ?`, [id]);
  return row ? toMailbox(row) : null;
}

/** Mark every active address whose time has run out as expired. Idempotent. */
export async function expireOverdueMailboxes(db: DbLike, now: number = Date.now()): Promise<number> {
  const result = await db.runAsync(
    `UPDATE mailboxes SET status = 'expired'
     WHERE status = 'active' AND expires_at <= ?`,
    [now],
  );
  return result.changes;
}

/** Delete one address. Its messages disappear too (ON DELETE CASCADE). */
export async function deleteMailbox(db: DbLike, id: number): Promise<void> {
  await db.runAsync('DELETE FROM mailboxes WHERE id = ?', [id]);
}

/** Helper for screens: the live status, counting down to expired. */
export function liveStatus(mailbox: Mailbox, now: number = Date.now()): Mailbox['status'] {
  if (mailbox.status !== 'active') return mailbox.status;
  return isExpired(mailbox.expiresAt, now) ? 'expired' : 'active';
}
