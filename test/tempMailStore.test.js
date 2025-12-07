import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveMailbox, sealMailboxRecord, unsealMailboxRecord } from '../functions/lib/tempMailStore.js';

const baseRecord = {
  id: 'demo-id',
  address: 'demo@1secmail.com',
  providerMailboxId: 'demo@1secmail.com',
  createdAt: 1_700_000_000_000,
  expiresAt: 1_700_000_600_000,
  fingerprint: 'fp',
};

describe('tempMailStore sealing', () => {
  it('seals and unseals mailbox records consistently', async () => {
    const token = await sealMailboxRecord({}, baseRecord);
    const payload = await unsealMailboxRecord({}, token);
    assert.ok(payload);
    assert.equal(payload.id, baseRecord.id);
    assert.equal(payload.providerMailboxId, baseRecord.providerMailboxId);
    assert.equal(payload.expiresAt, baseRecord.expiresAt);
  });

  it('rejects tampered tokens', async () => {
    const token = await sealMailboxRecord({ TEMP_MAIL_TOKEN_SECRET: 's1' }, baseRecord);
    const parts = token.split('.');
    const tampered = `${parts[0]}x.${parts[1]}`;
    const payload = await unsealMailboxRecord({ TEMP_MAIL_TOKEN_SECRET: 's1' }, tampered);
    assert.equal(payload, null);
  });

  it('resolves sealed mailboxes when store is unavailable', async () => {
    const token = await sealMailboxRecord({}, baseRecord);
    const mailbox = await resolveMailbox({}, baseRecord.id, token);
    assert.equal(mailbox.id, baseRecord.id);
    assert.equal(mailbox.accessToken, token);
  });
});

