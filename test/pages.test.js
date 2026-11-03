import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { onRequestPost as analyze } from '../functions/api/v1/analyze.js';
import { onRequestPost as breachCheck } from '../functions/api/v1/breach-check.js';
import { clearCache } from '../src/breachCheck.js';
import { app } from '../src/server.js';

// What Cloudflare Pages serves in production: functions/ for the API and
// public/ with the headers from public/_headers.

function post(handler, body, headers = { 'Content-Type': 'application/json' }) {
  const request = new Request('https://good-pass.pages.dev/api/v1/x', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  return handler({ request });
}

describe('Pages Function: POST /api/v1/analyze', () => {
  it('analyzes a valid password', async () => {
    const res = await post(analyze, { password: 'TestPassword123!' });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const body = await res.json();
    assert.ok(body.scoreLabel);
    assert.equal(typeof body.entropyBits, 'number');
    assert.ok(Array.isArray(body.strengths));
    assert.ok(Array.isArray(body.recommendations));
  });

  it('answers like the Express server', async () => {
    const server = app.listen(0);
    try {
      await new Promise((resolve) => server.once('listening', resolve));
      const { port } = server.address();
      for (const body of [{ password: 'X$k9Lm!2qW@7nRtP-ZvBc3Fg8Jh' }, { password: '' }, { password: 5 }]) {
        const viaExpress = await fetch(`http://localhost:${port}/api/v1/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const viaPages = await post(analyze, body);
        assert.equal(viaPages.status, viaExpress.status);
        assert.deepEqual(await viaPages.json(), await viaExpress.json());
      }
    } finally {
      server.close();
    }
  });

  it('returns 400 for a non-string password', async () => {
    const res = await post(analyze, { password: 12345 });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });

  it('treats a non-JSON body as empty, like express.json()', async () => {
    const res = await post(analyze, 'password=hello', { 'Content-Type': 'text/plain' });
    assert.equal(res.status, 400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await post(analyze, '{"password":');
    assert.equal(res.status, 400);
  });

  it('returns 413 for a body over 5 kB', async () => {
    const res = await post(analyze, { password: 'a'.repeat(6000) });
    assert.equal(res.status, 413);
  });

  it('rejects a password longer than 128 characters', async () => {
    const res = await post(analyze, { password: 'A'.repeat(200) });
    assert.equal(res.status, 400);
  });
});

describe('Pages Function: POST /api/v1/breach-check', () => {
  beforeEach(() => clearCache());

  it('sends only the 5-character prefix to HIBP (k-anonymity)', async (t) => {
    const urls = [];
    t.mock.method(globalThis, 'fetch', async (url) => {
      urls.push(String(url));
      return new Response('0018A45C4D1DEF81644B54AB7F969B88D65:3\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0\r\n');
    });

    const res = await post(breachCheck, { hashPrefix: '5baa6' });
    assert.equal(res.status, 200);
    assert.deepEqual(urls, ['https://api.pwnedpasswords.com/range/5BAA6']);
    const body = await res.json();
    assert.deepEqual(body.suffixes[0], { suffix: '0018A45C4D1DEF81644B54AB7F969B88D65', count: 3 });
  });

  it('rejects an invalid prefix without calling HIBP', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(''));
    for (const hashPrefix of ['AB', 'GHIJK', '5BAA61E4', undefined]) {
      const res = await post(breachCheck, { hashPrefix });
      assert.equal(res.status, 400);
    }
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it('reports HIBP being down as unavailable, not as an error status', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
    const res = await post(breachCheck, { hashPrefix: 'ABCDE' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.suffixes, []);
    assert.ok(body.error);
  });
});

describe('Pages static files', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(() => server.close());

  it('_headers sends the same CSP as the Express server', async () => {
    const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
    const line = headers.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
    assert.ok(line, 'public/_headers has no Content-Security-Policy');
    const pagesCsp = line.trim().slice('Content-Security-Policy:'.length).trim();

    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(pagesCsp, res.headers.get('content-security-policy'));
  });

  for (const page of ['index.html', '404.html']) {
    it(`${page} has nothing inline that the CSP blocks`, async () => {
      const html = await readFile(new URL(`../public/${page}`, import.meta.url), 'utf8');
      assert.doesNotMatch(html, /\sstyle\s*=/i, 'inline style attribute');
      assert.doesNotMatch(html, /<style[\s>]/i, '<style> element');
      assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i, 'inline <script>');
      assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'inline event handler');
    });
  }
});
