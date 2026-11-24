import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../src/server.js';

let server;
let baseUrl;

function request(path, options = {}) {
  const url = new URL(path, baseUrl);
  const body = options.body ? JSON.stringify(options.body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('HTTP API', () => {
  before((_, done) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  // --- Health check ---
  it('GET /healthz returns ok', async () => {
    const res = await request('/healthz');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  // --- Security headers ---
  it('includes security headers', async () => {
    const res = await request('/healthz');
    assert.ok(res.headers['x-content-type-options']);
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.ok(res.headers['content-security-policy']);
    assert.ok(res.headers['referrer-policy']);
  });

  it('CSP includes worker-src for service worker', async () => {
    const res = await request('/healthz');
    assert.ok(res.headers['content-security-policy'].includes('worker-src'));
  });

  it('does not expose x-powered-by', async () => {
    const res = await request('/healthz');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  // --- POST /api/v1/analyze ---
  it('analyzes a valid password', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'TestPassword123!' }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.scoreLabel);
    assert.equal(typeof res.body.entropyBits, 'number');
    assert.ok(res.body.estimatedTime);
    assert.ok(Array.isArray(res.body.strengths));
    assert.ok(Array.isArray(res.body.weaknesses));
    assert.equal(typeof res.body.estimatedSeconds, 'number');
  });

  it('response includes recommendations array', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'weak' }
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.recommendations));
  });

  it('recommendations have tip, example, entropyGain', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'hello' }
    });
    if (res.body.recommendations.length > 0) {
      const rec = res.body.recommendations[0];
      assert.ok(rec.tip);
      assert.ok(rec.example);
      assert.equal(typeof rec.entropyGain, 'number');
    }
  });

  it('strong password gets no recommendations', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'X$k9Lm!2qW@7nRtP-ZvBc3Fg8Jh' }
    });
    assert.equal(res.body.recommendations.length, 0);
  });

  it('returns 400 for non-string password', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 12345 }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('returns 400 for missing password', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: {}
    });
    assert.equal(res.status, 400);
  });

  it('handles empty password as special case (200)', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: '' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.scoreLabel, 'Пусто');
    assert.equal(res.body.entropyBits, 0);
    assert.ok(Array.isArray(res.body.recommendations));
  });

  it('rejects password longer than 128 characters', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'A'.repeat(200) }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('длинный'));
  });

  // --- POST /api/v1/breach-check ---
  it('rejects invalid hash prefix (too short)', async () => {
    const res = await request('/api/v1/breach-check', {
      method: 'POST',
      body: { hashPrefix: 'AB' }
    });
    assert.equal(res.status, 400);
  });

  it('rejects invalid hash prefix (non-hex)', async () => {
    const res = await request('/api/v1/breach-check', {
      method: 'POST',
      body: { hashPrefix: 'GHIJK' }
    });
    assert.equal(res.status, 400);
  });

  it('rejects missing hash prefix', async () => {
    const res = await request('/api/v1/breach-check', {
      method: 'POST',
      body: {}
    });
    assert.equal(res.status, 400);
  });

  it('answers in English with "lang": "en"', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'weekly-check-Storm#2045', lang: 'en' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.scoreLabel, 'Excellent');
    assert.equal(res.body.estimatedTime, 'Practically impossible to brute-force');
    assert.ok(res.body.weaknesses.includes('Birth years and dates are common in passwords.'));
    assert.deepEqual(res.body.weaknessCodes, ['date']);
  });

  it('answers a malformed body with 400 and an oversized one with 413, like Pages', async () => {
    const malformed = await new Promise((resolve, reject) => {
      const req = http.request(new URL('/api/v1/analyze', baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.end('{"password":');
    });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error, 'Некорректный JSON.');

    const large = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'a'.repeat(6000) },
      headers: { 'Accept-Language': 'en' }
    });
    assert.equal(large.status, 413);
    assert.equal(large.body.error, 'The request is too large.');
  });

  // --- Legacy route ---
  it('POST /api/analyze redirects to /api/v1/analyze', async () => {
    const url = new URL('/api/analyze', baseUrl);
    const body = JSON.stringify({ password: 'test123' });
    const res = await new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        resolve({ status: res.statusCode, headers: res.headers });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    assert.equal(res.status, 307);
    assert.ok(res.headers.location.includes('/api/v1/analyze'));
  });

  // Last: it spends the minute's allowance of 60 requests.
  it('limits the API to 60 requests a minute, in the asked language', async () => {
    let res;
    for (let i = 0; i < 61; i++) {
      res = await request('/api/v1/analyze', { method: 'POST', body: { password: 'x', lang: 'en' } });
      if (res.status === 429) break;
    }
    assert.equal(res.status, 429);
    assert.equal(res.body.error, 'Too many requests. Try again in a minute.');
  });
});
