// HTML sanitizer — HTML email is untrusted (FULL_BUILD_PROMPT §3.1).
// Rules applied, in plain English:
//  1. Remove <script>, <style>, <iframe>, <object>, <embed>, <form> blocks
//     entirely (with their contents).
//  2. Remove every attribute that starts with "on" (onclick, onload, ...)
//     and javascript: links — those are how scripts sneak in.
//  3. Remove remote images and other remote resources: <img src="http...">,
//     <link>, <video>/<audio> with a remote src. Only data: images (embedded
//     in the mail itself) are kept, because they need no network.
//  4. Keep simple formatting tags (<p>, <b>, <a>, <br>, lists, headings).
// The result is rendered as plain text by default; when HTML is shown it is
// this cleaned string, rendered with JavaScript disabled — so opening a
// message can never trigger a network request (FR-06, tested in
// tests/sanitizeHtml.test.ts).

const DANGEROUS_BLOCKS = /<(script|style|iframe|object|embed|form|noscript)[^>]*>[\s\S]*?<\/\1>/gi;
const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|form|link|meta|base|title)[^>]*>/gi;
const EVENT_ATTRS = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_HREF = /\s+(href|src|action)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi;
// Remote images / media: src that starts with http://, https:// or //
const REMOTE_SRC = /\s+src\s*=\s*"(https?:)?\/\/[^"]*"/gi;
const REMOTE_SRC_SINGLE = /\s+src\s*=\s*"'(https?:)?\/\/[^']*'"/gi;

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let clean = html;
  clean = clean.replace(DANGEROUS_BLOCKS, '');
  clean = clean.replace(DANGEROUS_TAGS, '');
  clean = clean.replace(EVENT_ATTRS, '');
  clean = clean.replace(JS_HREF, '');
  clean = clean.replace(REMOTE_SRC, '');
  clean = clean.replace(REMOTE_SRC_SINGLE, '');
  return clean.trim();
}

/** Plain-text view of an HTML body: tags stripped, entities decoded. */
export function htmlToText(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
