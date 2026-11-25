// Message repository — all SQL about messages lives here.
// Deduplication: (mailbox_id, provider_message_id) is UNIQUE, so fetching
// the same message twice stores it only once (INSERT OR IGNORE).
import type { DbLike } from '../types';
import type { Message } from '../../types';

interface MessageRow {
  id: number;
  mailbox_id: number;
  provider_message_id: string;
  from_address: string;
  subject: string;
  received_at: number;
  body_text: string;
  body_html_clean: string | null;
  is_read: number;
  fetched_at: number;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    mailboxId: row.mailbox_id,
    providerMessageId: row.provider_message_id,
    fromAddress: row.from_address,
    subject: row.subject,
    receivedAt: row.received_at,
    bodyText: row.body_text,
    bodyHtmlClean: row.body_html_clean,
    isRead: row.is_read === 1,
    fetchedAt: row.fetched_at,
  };
}

export interface NewMessage {
  mailboxId: number;
  providerMessageId: string;
  fromAddress: string;
  subject: string;
  receivedAt: number;
  bodyText: string;
  bodyHtmlClean: string | null;
}

/** Store fetched messages. Returns how many were NEW (duplicates ignored). */
export async function insertMessages(db: DbLike, messages: NewMessage[]): Promise<number> {
  if (messages.length === 0) return 0;
  const fetchedAt = Date.now();
  let inserted = 0;
  await db.execAsync('BEGIN TRANSACTION');
  try {
    for (const m of messages) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO messages
           (mailbox_id, provider_message_id, from_address, subject, received_at,
            body_text, body_html_clean, is_read, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          m.mailboxId,
          m.providerMessageId,
          m.fromAddress,
          m.subject,
          m.receivedAt,
          m.bodyText,
          m.bodyHtmlClean,
          fetchedAt,
        ],
      );
      inserted += result.changes;
    }
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
  return inserted;
}

export async function listMessagesForMailbox(db: DbLike, mailboxId: number): Promise<Message[]> {
  const rows = await db.getAllAsync<MessageRow>(
    'SELECT * FROM messages WHERE mailbox_id = ? ORDER BY received_at DESC',
    [mailboxId],
  );
  return rows.map(toMessage);
}

export async function getMessage(db: DbLike, id: number): Promise<Message | null> {
  const row = await db.getFirstAsync<MessageRow>('SELECT * FROM messages WHERE id = ?', [id]);
  return row ? toMessage(row) : null;
}

export async function markMessageRead(db: DbLike, id: number, read: boolean): Promise<void> {
  await db.runAsync('UPDATE messages SET is_read = ? WHERE id = ?', [read ? 1 : 0, id]);
}

export async function deleteMessage(db: DbLike, id: number): Promise<void> {
  await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
}

/** Clear all data: messages first, then mailboxes. Settings and the
 *  migration version are kept (seed FR-09). */
export async function clearAllData(db: DbLike): Promise<void> {
  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.execAsync('DELETE FROM messages');
    await db.execAsync('DELETE FROM mailboxes');
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
