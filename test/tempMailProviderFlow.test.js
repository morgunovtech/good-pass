import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMailbox, listMessages, getMessage } from '../functions/lib/tempMailProvider.js';

const originalFetch = global.fetch;

describe('temp mail provider (1secmail defaults)', () => {
  beforeEach(() => {
    global.fetch = async (url) => {
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
});
