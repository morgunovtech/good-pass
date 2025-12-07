const DEFAULT_BASE_URL = 'https://www.1secmail.com/api/v1';

export function getTempMailConfigStatus(env) {
  const missing = [];
  const baseUrl = env?.TEMP_MAIL_API_BASE_URL || DEFAULT_BASE_URL;
  if (!baseUrl) missing.push('TEMP_MAIL_API_BASE_URL');
  if (env?.TEMP_MAIL_API_REQUIRE_KEY === 'true' && !env?.TEMP_MAIL_API_KEY) {
    missing.push('TEMP_MAIL_API_KEY');
  }
  return { ok: missing.length === 0, missing, baseUrl };
}

function assertConfigured(env) {
  const status = getTempMailConfigStatus(env);
  if (!status.ok) {
    const error = new Error('Temp mail provider is not configured');
    error.code = 'not_configured';
    error.missing = status.missing;
    throw error;
  }
}

function resolveBase(env) {
  return env?.TEMP_MAIL_API_BASE_URL || DEFAULT_BASE_URL;
}

function toAuthHeaders(env) {
  const headers = { 'Accept': 'application/json' };
  if (env?.TEMP_MAIL_API_KEY) {
    // TODO: adjust auth scheme for provider if it differs from a simple bearer key
    headers['Authorization'] = `Bearer ${env.TEMP_MAIL_API_KEY}`;
  }
  return headers;
}

export async function createMailbox(env) {
  assertConfigured(env);
  const baseUrl = resolveBase(env);
  const url = `${baseUrl}/?action=genRandomMailbox&count=1`; // 1secmail: returns ["login@domain"]
  const headers = toAuthHeaders(env);

  // NOTE: 1secmail does not require a body for generation; adjust payload for other providers if needed.
  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`Temp-mail provider error: ${response.status}`);
  }

  const data = await response.json();
  const address = Array.isArray(data) ? data[0] : data?.address ?? data?.email;
  if (!address) {
    throw new Error('Temp-mail provider returned empty address');
  }

  return {
    // 1secmail uses the address as the identifier; if you switch providers, map to their mailbox id here.
    id: address,
    address,
  };
}

export async function listMessages(env, mailboxId) {
  assertConfigured(env);
  const baseUrl = resolveBase(env);
  const { login, domain } = splitAddress(mailboxId);
  const url = `${baseUrl}/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`;
  const headers = toAuthHeaders(env);

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`Temp-mail provider error: ${response.status}`);
  }

  const data = await response.json();
  return (Array.isArray(data) ? data : data?.messages ?? []).map((item) => ({
    id: item.id ?? item.messageId,
    from: item.from ?? item.sender,
    subject: item.subject ?? '(без темы)',
    receivedAt: item.date ?? item.receivedAt ?? item.createdAt,
    isRead: Boolean(item.isRead ?? false),
  }));
}

export async function getMessage(env, mailboxId, messageId) {
  assertConfigured(env);
  const baseUrl = resolveBase(env);
  const { login, domain } = splitAddress(mailboxId);
  const url = `${baseUrl}/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(messageId)}`;
  const headers = toAuthHeaders(env);

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`Temp-mail provider error: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id ?? data.messageId ?? messageId,
    from: data.from ?? data.sender,
    to: data.to ?? data.recipient,
    subject: data.subject ?? '(без темы)',
    receivedAt: data.date ?? data.receivedAt ?? data.createdAt,
    textBody: data.textBody ?? data.text ?? '',
    htmlBody: data.htmlBody ?? data.html ?? '',
  };
}

function splitAddress(address) {
  if (!address || typeof address !== 'string' || !address.includes('@')) {
    const error = new Error('Invalid mailbox address');
    error.code = 'invalid_address';
    throw error;
  }
  const [login, domain] = address.split('@');
  return { login, domain };
}
