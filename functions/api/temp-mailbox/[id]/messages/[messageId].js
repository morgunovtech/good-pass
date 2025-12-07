import { getMessage } from '../../../../../src/services/tempMailProvider.js';
import { getMailboxRecord, isExpired } from '../../../../../src/services/tempMailStore.js';
import { sanitizeHtml } from '../../../../../src/utils/sanitize.js';

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

    const message = await getMessage(env, mailbox.providerMailboxId, params.messageId);
    return jsonResponse({
      id: message.id,
      from: message.from ?? 'unknown',
      to: message.to ?? mailbox.address,
      subject: message.subject ?? '',
      receivedAt: message.receivedAt ?? now,
      textBody: message.textBody ?? '',
      htmlBodySanitized: sanitizeHtml(message.htmlBody)
    });
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
