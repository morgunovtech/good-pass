import { ProviderConfigError, getMessage } from '../../../../lib/tempMailProvider.js';
import { cleanupMemory, getMailbox } from '../../../../lib/tempMailStore.js';
import { escapeText, sanitizeHtml } from '../../../../lib/sanitizeHtml.js';

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const now = Date.now();
  cleanupMemory(now);

  const mailbox = await getMailbox(env, params.id);
  const authError = await validateAccess(request, mailbox, now);
  if (authError) return authError;

  try {
    const message = await getMessage(env, mailbox.providerMailboxId, params.messageId);
    return jsonResponse({
      id: message.id,
      from: message.from,
      to: message.to,
      subject: message.subject,
      receivedAt: message.receivedAt,
      textBody: message.textBody ?? '',
      htmlBodySanitized: sanitizeHtml(message.htmlBody ?? '') || escapeText(message.textBody ?? ''),
    });
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      return jsonResponse({ error: 'provider_not_configured', message: error.message }, 503);
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
