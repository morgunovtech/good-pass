import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, escapeText } from '../functions/lib/sanitizeHtml.js';

describe('sanitizeHtml', () => {
  it('removes scripts and dangerous attributes', () => {
    const dirty = '<p onclick="alert(1)">Hi</p><script>alert(2)</script><a href="javascript:alert(3)">x</a>';
    const clean = sanitizeHtml(dirty);
    assert.ok(!clean.includes('script'));
    assert.ok(!clean.includes('onclick'));
    assert.ok(!clean.includes('javascript:alert'));
    assert.match(clean, /<p>Hi<\/p>/);
  });

  it('preserves basic formatting and closing tags', () => {
    const html = '<strong>Bold</strong><br><em>Italic</em>';
    const clean = sanitizeHtml(html);
    assert.ok(clean.includes('<strong>Bold</strong>'));
    assert.ok(clean.includes('<br>'));
    assert.ok(clean.includes('<em>Italic</em>'));
  });
});

describe('escapeText', () => {
  it('escapes html special characters', () => {
    assert.equal(escapeText('<tag> & "quote"'), '&lt;tag&gt; &amp; &quot;quote&quot;');
  });
});
