// Time helpers — pure functions, easy to test, no side effects.

/** Milliseconds left until `expiresAt` (negative when already expired). */
export function msRemaining(expiresAt: number, now: number = Date.now()): number {
  return expiresAt - now;
}

export function isExpired(expiresAt: number, now: number = Date.now()): boolean {
  return msRemaining(expiresAt, now) <= 0;
}

/** "09:42" / "1:04:12" style countdown from a millisecond duration. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** Short human date/time for a message row, e.g. "24 Nov, 15:21". */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const day = d.getDate();
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month}, ${time}`;
}

/** Expiry timestamp for a new address created now. */
export function expiryFromNow(minutes: number, now: number = Date.now()): number {
  return now + minutes * 60 * 1000;
}
