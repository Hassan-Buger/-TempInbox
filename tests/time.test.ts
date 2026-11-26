import { formatCountdown, isExpired, msRemaining, expiryFromNow, formatDateTime } from '../src/utils/time';

describe('time helpers', () => {
  it('formats a countdown under one hour as MM:SS', () => {
    expect(formatCountdown(9 * 60 * 1000 + 42 * 1000)).toBe('09:42');
  });

  it('formats a countdown over one hour as H:MM:SS', () => {
    expect(formatCountdown(64 * 60 * 1000 + 5 * 1000)).toBe('1:04:05');
  });

  it('returns 00:00 when expired', () => {
    expect(formatCountdown(-1000)).toBe('00:00');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('isExpired is true at and after the expiry time', () => {
    expect(isExpired(1000, 1000)).toBe(true);
    expect(isExpired(1000, 999)).toBe(false);
  });

  it('msRemaining is negative after expiry', () => {
    expect(msRemaining(1000, 1500)).toBe(-500);
  });

  it('expiryFromNow adds the right number of minutes', () => {
    expect(expiryFromNow(10, 1_000_000)).toBe(1_000_000 + 600_000);
  });

  it('formatDateTime returns a readable string', () => {
    expect(formatDateTime(1_700_000_000_000)).toMatch(/\d+ \w+, \d{2}:\d{2}/);
  });
});
