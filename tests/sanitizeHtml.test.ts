import { sanitizeHtml, htmlToText } from '../src/utils/sanitizeHtml';

describe('sanitizeHtml (FR-06: no network on open)', () => {
  it('removes script blocks entirely', () => {
    const out = sanitizeHtml('<p>Hello</p><script>alert("x")</script>');
    expect(out).not.toContain('script');
    expect(out).toContain('Hello');
  });

  it('removes iframes', () => {
    expect(sanitizeHtml('<iframe src="https://evil.example/x"></iframe><p>ok</p>')).not.toContain('iframe');
  });

  it('strips remote image sources', () => {
    const out = sanitizeHtml('<img src="https://tracker.example/pixel.png"><p>ok</p>');
    expect(out).not.toContain('tracker.example');
    expect(out).toContain('ok');
  });

  it('strips event-handler attributes', () => {
    const out = sanitizeHtml('<p onclick="steal()">hi</p>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('hi');
  });

  it('strips javascript: links', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
  });

  it('keeps safe formatting and normal links', () => {
    const out = sanitizeHtml('<p><b>Bold</b> and <a href="https://example.com">a link</a></p>');
    expect(out).toContain('<b>Bold</b>');
    expect(out).toContain('https://example.com');
  });

  it('keeps embedded data: images (no network needed)', () => {
    const out = sanitizeHtml('<img src="data:image/png;base64,AAA">');
    expect(out).toContain('data:image/png');
  });
});

describe('htmlToText', () => {
  it('converts HTML to readable plain text', () => {
    expect(htmlToText('<p>Hello <b>world</b></p><p>Second line</p>')).toContain('Hello world');
    expect(htmlToText('<p>Hello <b>world</b></p><p>Second line</p>')).toContain('Second line');
  });

  it('decodes common entities', () => {
    expect(htmlToText('<p>Fish &amp; Chips</p>')).toBe('Fish & Chips');
  });
});
