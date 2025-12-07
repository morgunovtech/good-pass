import { createMailbox } from '../../src/services/tempMailProvider.js';
import { createMailboxRecord } from '../../src/services/tempMailStore.js';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

export async function onRequestPost(context) {
  const { env, request } = context;
  const now = Date.now();
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';

  try {
    const providerMailbox = await createMailbox(env);
    const record = await createMailboxRecord(env, {
      address: providerMailbox.address,
      providerMailboxId: providerMailbox.id,
      ip,
      userAgent,
      now
    });

    return jsonResponse({
      mailboxId: record.id,
      address: record.address,
      expiresAt: record.expiresAt,
      accessToken: record.accessToken
    }, 201);
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
  if (message === 'temp_mail_rate_limit') {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }
  return jsonResponse({ error: 'temp_mail_failed', detail: message }, 502);
}
