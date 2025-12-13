import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMailbox, listMessages, getMessage } from '../functions/lib/tempMailProvider.js';

const originalFetch = global.fetch;

describe('temp mail provider (1secmail defaults)', () => {
  beforeEach(() => {
    global.fetch = async (url) => {
      if (String(url).includes('getDomainList')) {
        return new Response(JSON.stringify(['1secmail.com', '1secmail.org']), { status: 200 });
      }
      if (String(url).includes('getMessages')) {
        return new Response(
          JSON.stringify([
            { id: 1, from: 'test@example.com', subject: 'Hello', date: '2024-01-01T00:00:00Z', seen: false },
          ]),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: 1,
          from: 'test@example.com',
          to: 'user@demo',
          subject: 'Hello',
          date: '2024-01-01T00:00:00Z',
          textBody: 'Hi there',
          htmlBody: '<p>Hi there</p>',
        }),
        { status: 200 }
      );
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates mailbox with allowed domain', async () => {
    const mailbox = await createMailbox({ TEMP_MAIL_DOMAINS: 'example.test' });
    assert.equal(mailbox.address.endsWith('@example.test'), true);
    assert.ok(mailbox.id.includes(':'));
  });

  it('maps listMessages payload', async () => {
    const messages = await listMessages({}, 'demo:example.test');
    assert.equal(messages.length, 1);
    assert.deepEqual(messages[0], {
      id: 1,
      from: 'test@example.com',
      subject: 'Hello',
      receivedAt: '2024-01-01T00:00:00Z',
      isRead: false,
    });
  });

  it('maps getMessage payload', async () => {
    const message = await getMessage({}, 'demo:example.test', 1);
    assert.equal(message.subject, 'Hello');
    assert.equal(message.textBody, 'Hi there');
    assert.equal(message.htmlBody.includes('Hi there'), true);
  });

  it('falls back to live domain list when allow list is absent', async () => {
    const mailbox = await createMailbox({});
    assert.ok(mailbox.address.endsWith('@1secmail.com') || mailbox.address.endsWith('@1secmail.org'));
  });
});

describe('temp mail provider (mock mode)', () => {
  it('returns predictable mailbox and messages without network', async () => {
    let called = false;
    const original = global.fetch;
    global.fetch = () => {
      called = true;
      throw new Error('network should not be called in mock mode');
    };

    const env = { TEMP_MAIL_MODE: 'mock' };
    const mailbox = await createMailbox(env);
    assert.ok(mailbox.address.includes('@example.test'));

    const messages = await listMessages(env, mailbox.id);
    assert.equal(messages.length, 1);
    const detail = await getMessage(env, mailbox.id, messages[0].id);
    assert.equal(detail.subject.includes('mock'), true);
    assert.equal(called, false);

    global.fetch = original;
  });
});
