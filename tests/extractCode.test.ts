import { extractVerificationCode } from '../src/features/verification/extractCode';

describe('extractVerificationCode', () => {
  it('finds a 6-digit code after the word "code"', () => {
    expect(extractVerificationCode('Your verification code is 482913. It expires soon.')).toBe('482913');
  });

  it('finds a 4-digit OTP', () => {
    expect(extractVerificationCode('Your OTP is 1234. Do not share it.')).toBe('1234');
  });

  it('finds an 8-digit code', () => {
    expect(extractVerificationCode('Verification code: 12345678')).toBe('12345678');
  });

  it('returns null when there is no keyword near the number', () => {
    expect(extractVerificationCode('Your order total is 482913 rupees.')).toBeNull();
  });

  it('returns null when there is no number at all', () => {
    expect(extractVerificationCode('Your verification code is on its way.')).toBeNull();
  });

  it('returns null for a 3-digit number (too short)', () => {
    expect(extractVerificationCode('Your code is 123.')).toBeNull();
  });

  it('returns null for a 9-digit number (too long)', () => {
    expect(extractVerificationCode('Your code is 123456789.')).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(extractVerificationCode('')).toBeNull();
  });

  it('is case-insensitive about the keyword', () => {
    expect(extractVerificationCode('Your VERIFICATION CODE is 987654.')).toBe('987654');
  });
});
