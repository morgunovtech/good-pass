import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ProviderConfigError, createMailbox, listMessages, getMessage } from '../functions/lib/tempMailProvider.js';

describe('tempMailProvider configuration', () => {
  it('throws ProviderConfigError when base url is missing', async () => {
    await assert.rejects(() => createMailbox({}), ProviderConfigError);
    await assert.rejects(() => listMessages({}, 'id'), ProviderConfigError);
    await assert.rejects(() => getMessage({}, 'id', 'msg'), ProviderConfigError);
  });

  it('uses fetch when base url is present', async () => {
    const env = { TEMP_MAIL_API_BASE_URL: 'https://example.test' };
    const fakeResponse = { ok: true, json: async () => ({ id: 'a', address: 'a@example.test' }) };
    const restore = mock.method(globalThis, 'fetch', () => fakeResponse);

    const mailbox = await createMailbox(env);
    assert.equal(mailbox.id, 'a');
    assert.equal(mailbox.address, 'a@example.test');

    restore.mock.restore();
  });
});
