// Database tests — the SQL from src/db runs here against a real SQLite
// engine (node:sqlite, in-memory) through tests/dbAdapter.ts.
import { createTestDb } from './dbAdapter';
import { migrate } from '../src/db/migrate';
import { SCHEMA_VERSION } from '../src/db/schema';
import {
  createMailbox,
  listMailboxes,
  getMailbox,
  expireOverdueMailboxes,
  deleteMailbox,
} from '../src/db/repositories/addressRepository';
import {
  insertMessages,
  listMessagesForMailbox,
  markMessageRead,
  deleteMessage,
  clearAllData,
} from '../src/db/repositories/messageRepository';
import { getSetting, setSetting, getDefaultExpiryMinutes } from '../src/db/repositories/settingsRepository';
import type { DbLike } from '../src/db/types';

let db: DbLike;
let close: () => void;

beforeEach(async () => {
  ({ db, close } = createTestDb());
  await migrate(db);
});

afterEach(() => close());

const mailbox = (over: Partial<Record<string, unknown>> = {}) => ({
  address: 'abc123@example.test',
  providerRef: 'ref-1',
  createdAt: 1_000_000,
  expiresAt: 1_600_000,
  ...over,
});

describe('migrations', () => {
  it('fresh install reaches schema version 1', async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(SCHEMA_VERSION);
  });

  it('migrating twice is safe (idempotent)', async () => {
    await migrate(db);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(SCHEMA_VERSION);
  });

  it('foreign keys are enforced on the test connection', async () => {
    const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(row?.foreign_keys).toBe(1);
  });
});

describe('mailboxes', () => {
  it('creates and lists a mailbox, visible after a fresh read', async () => {
    const id = await createMailbox(db, mailbox());
    expect(id).toBeGreaterThan(0);
    const rows = await listMailboxes(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe('abc123@example.test');
    expect(rows[0].status).toBe('active');
    expect(rows[0].messageCount).toBe(0);
  });

  it('rejects a duplicate address (UNIQUE)', async () => {
    await createMailbox(db, mailbox());
    await expect(createMailbox(db, mailbox())).rejects.toThrow();
  });

  it('rejects expiry before creation (CHECK)', async () => {
    await expect(
      createMailbox(db, mailbox({ createdAt: 2_000_000, expiresAt: 1_000_000 })),
    ).rejects.toThrow();
  });

  it('marks overdue addresses expired and keeps the rest active', async () => {
    await createMailbox(db, mailbox({ address: 'old@example.test', expiresAt: 1_100_000 }));
    await createMailbox(db, mailbox({ address: 'new@example.test', expiresAt: 9_999_999 }));
    const changed = await expireOverdueMailboxes(db, 2_000_000);
    expect(changed).toBe(1);
    const rows = await listMailboxes(db);
    expect(rows.find((r) => r.address === 'old@example.test')?.status).toBe('expired');
    expect(rows.find((r) => r.address === 'new@example.test')?.status).toBe('active');
  });

  it('deleting a mailbox cascade-deletes its messages', async () => {
    const id = await createMailbox(db, mailbox());
    await insertMessages(db, [
      { mailboxId: id, providerMessageId: 'm1', fromAddress: 'a@b.test', subject: 'Hi', receivedAt: 1_000_100, bodyText: 'hello', bodyHtmlClean: null },
      { mailboxId: id, providerMessageId: 'm2', fromAddress: 'a@b.test', subject: 'Hi 2', receivedAt: 1_000_200, bodyText: 'hello 2', bodyHtmlClean: null },
    ]);
    expect(await listMessagesForMailbox(db, id)).toHaveLength(2);
    await deleteMailbox(db, id);
    expect(await getMailbox(db, id)).toBeNull();
    expect(await listMessagesForMailbox(db, id)).toHaveLength(0);
  });
});

describe('messages', () => {
  it('stores a fetched message once, and ignores the duplicate on re-fetch', async () => {
    const id = await createMailbox(db, mailbox());
    const msg = {
      mailboxId: id,
      providerMessageId: 'm1',
      fromAddress: 'a@b.test',
      subject: 'Code',
      receivedAt: 1_000_100,
      bodyText: 'code 123456',
      bodyHtmlClean: null,
    };
    expect(await insertMessages(db, [msg])).toBe(1);
    expect(await insertMessages(db, [msg])).toBe(0); // duplicate ignored
    expect(await listMessagesForMailbox(db, id)).toHaveLength(1);
  });

  it('rejects a message for a mailbox that does not exist (foreign key)', async () => {
    await expect(
      insertMessages(db, [
        { mailboxId: 999, providerMessageId: 'm1', fromAddress: 'a@b.test', subject: '', receivedAt: 1, bodyText: '', bodyHtmlClean: null },
      ]),
    ).rejects.toThrow();
  });

  it('mark read/unread persists', async () => {
    const id = await createMailbox(db, mailbox());
    await insertMessages(db, [
      { mailboxId: id, providerMessageId: 'm1', fromAddress: 'a@b.test', subject: 'Hi', receivedAt: 1_000_100, bodyText: 'hello', bodyHtmlClean: null },
    ]);
    const [msg] = await listMessagesForMailbox(db, id);
    expect(msg.isRead).toBe(false);
    await markMessageRead(db, msg.id, true);
    expect((await listMessagesForMailbox(db, id))[0].isRead).toBe(true);
    await markMessageRead(db, msg.id, false);
    expect((await listMessagesForMailbox(db, id))[0].isRead).toBe(false);
  });

  it('deleting one message leaves the address and other messages alone', async () => {
    const id = await createMailbox(db, mailbox());
    await insertMessages(db, [
      { mailboxId: id, providerMessageId: 'm1', fromAddress: 'a@b.test', subject: '1', receivedAt: 1, bodyText: 'one', bodyHtmlClean: null },
      { mailboxId: id, providerMessageId: 'm2', fromAddress: 'a@b.test', subject: '2', receivedAt: 2, bodyText: 'two', bodyHtmlClean: null },
    ]);
    const [first] = await listMessagesForMailbox(db, id);
    await deleteMessage(db, first.id);
    expect(await listMessagesForMailbox(db, id)).toHaveLength(1);
    expect(await getMailbox(db, id)).not.toBeNull();
  });

  it('clear all data empties mailboxes and messages but keeps settings', async () => {
    const id = await createMailbox(db, mailbox());
    await insertMessages(db, [
      { mailboxId: id, providerMessageId: 'm1', fromAddress: 'a@b.test', subject: '1', receivedAt: 1, bodyText: 'one', bodyHtmlClean: null },
    ]);
    await setSetting(db, 'default_expiry_minutes', '60');
    await clearAllData(db);
    expect(await listMailboxes(db)).toHaveLength(0);
    expect(await listMessagesForMailbox(db, id)).toHaveLength(0);
    expect(await getSetting(db, 'default_expiry_minutes')).toBe('60');
  });
});

describe('settings', () => {
  it('default expiry is 10 minutes when nothing is set', async () => {
    expect(await getDefaultExpiryMinutes(db)).toBe(10);
  });

  it('stores and updates a setting', async () => {
    await setSetting(db, 'default_expiry_minutes', '60');
    expect(await getDefaultExpiryMinutes(db)).toBe(60);
    await setSetting(db, 'default_expiry_minutes', '1440');
    expect(await getDefaultExpiryMinutes(db)).toBe(1440);
  });

  it('returns null for an unknown key', async () => {
    expect(await getSetting(db, 'nope')).toBeNull();
  });
});
