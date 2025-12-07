import { createMailbox, getTempMailConfigStatus } from '../../lib/tempMailProvider.js';
import { cleanupMemory, countActiveMailboxes, enforceRateLimit, hashFingerprint, isPersistentStoreAvailable, saveMailbox } from '../../lib/tempMailStore.js';

const TTL_MS = 10 * 60 * 1000;

export async function onRequestPost(context) {
  const { request, env } = context;
  const now = Date.now();
  const config = getTempMailConfigStatus(env);
  if (!config.ok) {
    return jsonResponse({ error: 'not_configured', missing: config.missing }, 503);
  }
  if (!isPersistentStoreAvailable(env)) {
    return jsonResponse({ error: 'not_configured', missing: ['TEMP_MAIL_STORE'] }, 503);
  }
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const ua = request.headers.get('user-agent') || '';
  const fingerprint = await hashFingerprint(ip, ua);

  cleanupMemory(now);

  if (!enforceRateLimit(fingerprint, now)) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const activeCount = await countActiveMailboxes(env, fingerprint, now);
  if (activeCount >= 3) {
    return jsonResponse({ error: 'too_many_mailboxes' }, 429);
  }

  let providerMailbox;
  try {
    providerMailbox = await createMailbox(env);
  } catch (error) {
    if (error?.code === 'not_configured') {
      return jsonResponse({ error: 'not_configured', missing: error.missing || [] }, 503);
    }
    return jsonResponse({ error: 'provider_unavailable', message: error.message }, 502);
  }

  if (!providerMailbox?.id || !providerMailbox?.address) {
    return jsonResponse({ error: 'provider_invalid_payload' }, 502);
  }

  const id = crypto.randomUUID();
  const accessToken = crypto.randomUUID();
  const record = {
    id,
    address: providerMailbox.address,
    providerMailboxId: providerMailbox.id,
    accessToken,
    createdAt: now,
    expiresAt: now + TTL_MS,
    fingerprint,
  };

  await saveMailbox(env, record);

  return jsonResponse({
    mailboxId: record.id,
    address: record.address,
    expiresAt: record.expiresAt,
    accessToken: record.accessToken,
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
