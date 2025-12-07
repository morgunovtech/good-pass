import { listMessages } from '../../../../src/services/tempMailProvider.js';
import { getMailboxRecord, isExpired } from '../../../../src/services/tempMailStore.js';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const accessToken = request.headers.get('x-access-token') ?? new URL(request.url).searchParams.get('accessToken');
  const now = Date.now();

  try {
    const mailbox = await getMailboxRecord(env, params.id);
    if (!mailbox) {
      return jsonResponse({ error: 'not_found' }, 404);
    }
    if (mailbox.accessToken !== accessToken) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }
    if (isExpired(mailbox, now)) {
      return jsonResponse({ error: 'expired' }, 410);
    }

    const messages = await listMessages(env, mailbox.providerMailboxId);
    const payload = messages.map((msg) => ({
      id: msg.id,
      from: msg.from ?? 'unknown',
      subject: msg.subject ?? '',
      receivedAt: msg.receivedAt ?? now,
      isRead: Boolean(msg.isRead)
    }));

    return jsonResponse({ messages: payload });
  } catch (error) {
    return handleError(error);
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

function handleError(error) {
  const message = error?.message ?? 'unknown_error';
  if (message === 'temp_mail_provider_not_configured') {
    return jsonResponse({ error: 'service_unavailable', reason: 'provider_not_configured' }, 503);
  }
  return jsonResponse({ error: 'temp_mail_failed', detail: message }, 502);
}
