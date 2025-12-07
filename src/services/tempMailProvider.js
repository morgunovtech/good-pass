const TEMP_MAIL_TIMEOUT_MS = 8000;

/**
 * Abstraction over a temp-mail provider.
 * TODO: replace endpoint paths and payload mappings with the real provider fields.
 */
export async function createMailbox(env, fetchImpl = fetch) {
  assertProviderConfig(env);

  if (useMock(env)) {
    const mockId = crypto.randomUUID();
    return { id: `mock-${mockId}`, address: `${mockId.slice(0, 8)}@example.test` };
  }

  const url = new URL('/mailboxes', env.TEMP_MAIL_API_BASE_URL);
  const response = await fetchWithTimeout(url.toString(), {
    method: 'POST',
    headers: buildHeaders(env),
  }, fetchImpl);

  if (!response.ok) {
    throw new Error(`temp_mail_create_failed:${response.status}`);
  }

  // TODO: map response JSON to { id, address }
  const data = await response.json();
  const providerMailboxId = data.id; // TODO: adjust according to provider schema
  const address = data.address; // TODO: adjust according to provider schema

  if (!providerMailboxId || !address) {
    throw new Error('temp_mail_create_invalid_response');
  }

  return { id: providerMailboxId, address };
}

export async function listMessages(env, mailboxId, fetchImpl = fetch) {
  assertProviderConfig(env);

  if (useMock(env)) {
    return [];
  }

  const url = new URL(`/mailboxes/${encodeURIComponent(mailboxId)}/messages`, env.TEMP_MAIL_API_BASE_URL);
  const response = await fetchWithTimeout(url.toString(), {
    headers: buildHeaders(env),
  }, fetchImpl);

  if (!response.ok) {
    throw new Error(`temp_mail_list_failed:${response.status}`);
  }

  // TODO: map provider messages to the unified shape
  const data = await response.json();
  return (data.messages ?? data ?? []).map((msg) => ({
    id: msg.id, // TODO: adjust
    from: msg.from, // TODO: adjust
    subject: msg.subject ?? '',
    receivedAt: msg.receivedAt ?? msg.date ?? Date.now(),
    isRead: Boolean(msg.isRead ?? msg.read)
  }));
}

export async function getMessage(env, mailboxId, messageId, fetchImpl = fetch) {
  assertProviderConfig(env);

  if (useMock(env)) {
    return {
      id: messageId,
      from: 'noreply@example.test',
      to: `${mailboxId}@example.test`,
      subject: 'Mock message',
      receivedAt: Date.now(),
      textBody: 'Temp-mail mock provider is active. Configure a real provider to receive live mail.',
      htmlBody: '<p>Temp-mail mock provider is active.</p>'
    };
  }

  const url = new URL(`/mailboxes/${encodeURIComponent(mailboxId)}/messages/${encodeURIComponent(messageId)}`, env.TEMP_MAIL_API_BASE_URL);
  const response = await fetchWithTimeout(url.toString(), {
    headers: buildHeaders(env),
  }, fetchImpl);

  if (!response.ok) {
    throw new Error(`temp_mail_get_failed:${response.status}`);
  }

  // TODO: map provider detail to the unified shape
  const data = await response.json();
  return {
    id: data.id ?? messageId,
    from: data.from,
    to: data.to,
    subject: data.subject ?? '',
    receivedAt: data.receivedAt ?? data.date ?? Date.now(),
    textBody: data.text ?? data.textBody ?? '',
    htmlBody: data.html ?? data.htmlBody ?? ''
  };
}

function buildHeaders(env) {
  const headers = { 'Content-Type': 'application/json' };
  if (env.TEMP_MAIL_API_KEY) {
    headers['Authorization'] = `Bearer ${env.TEMP_MAIL_API_KEY}`; // TODO: adapt to provider auth scheme
  }
  return headers;
}

function assertProviderConfig(env) {
  if (!useMock(env) && !env?.TEMP_MAIL_API_BASE_URL) {
    throw new Error('temp_mail_provider_not_configured');
  }
}

function useMock(env) {
  return env?.TEMP_MAIL_MODE === 'mock';
}

async function fetchWithTimeout(url, options, fetchImpl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEMP_MAIL_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
