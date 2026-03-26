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
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
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
  });

  it('rejects password longer than 128 characters', async () => {
    const res = await request('/api/v1/analyze', {
      method: 'POST',
      body: { password: 'A'.repeat(200) }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('длинный'));
  });

  // --- Legacy route redirect ---

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
});
