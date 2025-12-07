import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMailboxRecord, getMailboxRecord, isExpired, purgeMailbox } from '../src/services/tempMailStore.js';

test('creates mailbox with ttl and access token', async () => {
  const env = {};
  const now = Date.now();
  const record = await createMailboxRecord(env, {
    address: 'demo@example.test',
    providerMailboxId: 'provider-1',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    now,
    ttlMs: 60_000
  });

  assert.ok(record.id);
  assert.ok(record.accessToken);
  assert.equal(record.expiresAt, now + 60_000);
  assert.equal(record.address, 'demo@example.test');
  assert.equal(record.providerMailboxId, 'provider-1');
  const stored = await getMailboxRecord(env, record.id);
  assert.equal(stored.id, record.id);
});

test('expires after ttl and enforces per-ip limit', async () => {
  const env = {};
  const now = Date.now();
  const baseInput = { address: 'demo@example.test', providerMailboxId: 'provider-1', ip: '10.0.0.1', userAgent: 'ua' };
  const first = await createMailboxRecord(env, { ...baseInput, now, ttlMs: 500 });
  const second = await createMailboxRecord(env, { ...baseInput, now, ttlMs: 500 });
  const third = await createMailboxRecord(env, { ...baseInput, now, ttlMs: 500 });

  await assert.rejects(
    () => createMailboxRecord(env, { ...baseInput, now, ttlMs: 500 }),
    /temp_mail_rate_limit/
  );

  assert.equal(isExpired(first, now + 600), true);

  await purgeMailbox(env, first.id);
  await purgeMailbox(env, second.id);
  await purgeMailbox(env, third.id);
});
