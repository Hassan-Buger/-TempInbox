// Shared TypeScript types. Screens and repositories pass these objects
// around; nothing is stored as an untyped "any".

export type MailboxStatus = 'active' | 'expired' | 'deleted';

export interface Mailbox {
  id: number;
  address: string;
  providerRef: string;
  createdAt: number; // unix milliseconds
  expiresAt: number; // unix milliseconds
  status: MailboxStatus;
  unreadCount?: number;
  messageCount?: number;
}

export interface Message {
  id: number;
  mailboxId: number;
  providerMessageId: string;
  fromAddress: string;
  subject: string;
  receivedAt: number; // unix milliseconds
  bodyText: string;
  bodyHtmlClean: string | null;
  isRead: boolean;
  fetchedAt: number; // unix milliseconds
}

export interface Setting {
  key: string;
  value: string;
}

/** Expiry choices offered in Settings (seed §9 Q4). */
export const EXPIRY_OPTIONS = [
  { label: '10 minutes', minutes: 10 },
  { label: '1 hour', minutes: 60 },
  { label: '24 hours', minutes: 1440 },
] as const;

export const DEFAULT_EXPIRY_MINUTES = 10;
