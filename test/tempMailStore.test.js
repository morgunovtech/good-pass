import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { countActiveMailboxes, getMailbox, saveMailbox } from '../functions/lib/tempMailStore.js';

class FakeKV {
  constructor(now = Date.now()) {
    this.now = now;
    this.data = new Map();
  }

  async put(key, value, options = {}) {
    const ttlMs = (options.expirationTtl ?? 0) * 1000;
    this.data.set(key, { value, expiresAt: this.now + ttlMs });
  }

  async get(key) {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async list({ prefix } = {}) {
    const keys = [];
    for (const [name, entry] of this.data.entries()) {
      if (entry.expiresAt <= this.now) {
        this.data.delete(name);
        continue;
      }
      if (!prefix || name.startsWith(prefix)) {
        keys.push({ name });
      }
    }
    return { keys };
  }

  advance(ms) {
    this.now += ms;
  }
}

describe('tempMailStore with KV', () => {
  it('stores mailbox and counts active per fingerprint', async () => {
    const kv = new FakeKV(1_000);
    const env = { TEMP_MAIL_STORE: kv };
    const record = {
      id: 'abc',
      address: 'demo@example.com',
      providerMailboxId: 'demo@example.com',
      accessToken: 'token',
      createdAt: 1_000,
      expiresAt: 1_000 + 600_000,
      fingerprint: 'fp1',
    };

    await saveMailbox(env, record);
    const fetched = await getMailbox(env, 'abc');
    assert.equal(fetched.address, record.address);

    const count = await countActiveMailboxes(env, 'fp1', kv.now);
    assert.equal(count, 1);

    kv.advance(700_000); // expire past TTL
    assert.equal(await getMailbox(env, 'abc'), null);
    const countAfterExpiry = await countActiveMailboxes(env, 'fp1', kv.now);
    assert.equal(countAfterExpiry, 0);
  });
});
