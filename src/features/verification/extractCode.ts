// Verification-code detection — the distinctive feature (seed §6), together
// with the visible expiry countdown.
// Pure function: same input always gives the same output, no network, no
// storage. The code is only shown to the user; it is never sent anywhere.
//
// Rule (seed §10): a conservative pattern — 4 to 8 digits near the words
// "code", "verification" or "OTP". We look for the keyword first, then take
// the first 4–8 digit group within 40 characters after it. If no keyword is
// near a number, we return null (better to miss a code than to copy the
// wrong number, e.g. a phone number or an order total).

const KEYWORDS = /\b(code|verification|otp)\b/i;
const DIGITS = /\b(\d{4,8})\b/;

export function extractVerificationCode(bodyText: string): string | null {
  if (!bodyText) return null;
  const keywordMatch = KEYWORDS.exec(bodyText);
  if (!keywordMatch) return null;
  // Search only the text after the keyword, up to 40 characters ahead.
  const afterKeyword = bodyText.slice(keywordMatch.index, keywordMatch.index + 40);
  const digitsMatch = DIGITS.exec(afterKeyword);
  if (!digitsMatch) return null;
  return digitsMatch[1];
}
