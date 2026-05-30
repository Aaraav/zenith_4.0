import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/services/sanitize.js';

describe('sanitizeHtml', () => {
  it('strips <script> tags', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).toContain('<p>hi</p>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('alert');
  });

  it('strips inline event handlers', () => {
    const out = sanitizeHtml('<img src=x onerror="alert(1)" />');
    expect(out).not.toContain('onerror');
  });

  it('preserves allowed structural tags', () => {
    const html = '<h2>Title</h2><pre><code>console.log(1)</code></pre><ul><li>a</li></ul>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<h2>Title</h2>');
    expect(out).toContain('<pre>');
    expect(out).toContain('<code>');
    expect(out).toContain('<li>a</li>');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(123)).toBe('');
  });
});
