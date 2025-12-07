import { getTempMailConfigStatus, listMessages } from '../../../../lib/tempMailProvider.js';
import { cleanupMemory, getMailbox, isPersistentStoreAvailable } from '../../../../lib/tempMailStore.js';

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const now = Date.now();
  const config = getTempMailConfigStatus(env);
  if (!config.ok) {
    return jsonResponse({ error: 'not_configured', missing: config.missing }, 503);
  }
  if (!isPersistentStoreAvailable(env)) {
    return jsonResponse({ error: 'not_configured', missing: ['TEMP_MAIL_STORE'] }, 503);
  }
  cleanupMemory(now);

  const mailbox = await getMailbox(env, params.id);
  const authError = await validateAccess(request, mailbox, now);
  if (authError) return authError;

  try {
    const items = await listMessages(env, mailbox.providerMailboxId);
    const mapped = items.map((item) => ({
      id: item.id,
      from: item.from,
      subject: item.subject,
      receivedAt: item.receivedAt,
      isRead: Boolean(item.isRead),
    }));
    return jsonResponse({ messages: mapped });
  } catch (error) {
    if (error?.code === 'not_configured') {
      return jsonResponse({ error: 'not_configured', missing: error.missing || [] }, 503);
    }
    return jsonResponse({ error: 'provider_unavailable', message: error.message }, 502);
  }
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

async function validateAccess(request, mailbox, now) {
  if (!mailbox) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  if (mailbox.expiresAt <= now) {
    return jsonResponse({ error: 'expired' }, 410);
  }

  const token = request.headers.get('x-access-token') || new URL(request.url).searchParams.get('accessToken');
  if (!token || token !== mailbox.accessToken) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  return null;
}
