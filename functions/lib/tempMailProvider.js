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
  return status.baseUrl;
}

export async function createMailbox(env) {
  const baseUrl = assertConfigured(env);
  const apiKey = env?.TEMP_MAIL_API_KEY;

  const url = `${baseUrl}/?action=genRandomMailbox&count=1`;
  const headers = { 'Accept': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`; // 1secmail не требует ключ, но оставляем для совместимости

  const data = await fetchJson(url, headers);
  const address = Array.isArray(data) ? data[0] : data?.address || data?.email;
  if (!address) {
    throw new Error('Temp-mail provider did not return an address');
  }

  const { login, domain } = parseMailboxAddress(address);

  // id включает логин и домен, чтобы однозначно восстановить параметры провайдера
  return {
    id: `${login}@${domain}`,
    address,
  };
}

export async function listMessages(env, mailboxId) {
  const baseUrl = assertConfigured(env);
  const apiKey = env?.TEMP_MAIL_API_KEY;
  const { login, domain } = parseMailboxIdentifier(mailboxId);

  const url = `${baseUrl}/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`;
  const headers = { 'Accept': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const data = await fetchJson(url, headers);
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id ?? item.messageId,
    from: item.from ?? item.sender,
    subject: item.subject ?? '(без темы)',
    receivedAt: item.date ?? item.receivedAt ?? item.createdAt,
    isRead: Boolean(item.seen ?? item.isRead ?? false),
  }));
}

export async function getMessage(env, mailboxId, messageId) {
  const baseUrl = assertConfigured(env);
  const apiKey = env?.TEMP_MAIL_API_KEY;
  const { login, domain } = parseMailboxIdentifier(mailboxId);

  const url = `${baseUrl}/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(messageId)}`;
  const headers = { 'Accept': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const data = await fetchJson(url, headers);
  return {
    id: data.id ?? data.messageId ?? messageId,
    from: data.from ?? data.sender,
    to: data.to ?? data.recipient,
    subject: data.subject ?? '(без темы)',
    receivedAt: data.date ?? data.receivedAt ?? data.createdAt,
    textBody: data.textBody ?? data.text ?? data.body ?? '',
    htmlBody: data.htmlBody ?? data.html ?? data.body ?? '',
  };
}

function parseMailboxIdentifier(mailboxId) {
  // поддерживаем как plain e-mail (login@domain), так и сохранённый id вида "login:domain"
  if (!mailboxId) throw new Error('Missing mailbox id');
  if (mailboxId.includes('@')) {
    return parseMailboxAddress(mailboxId);
  }
  const [login, domain] = mailboxId.split(':');
  if (!login || !domain) {
    throw new Error('Invalid mailbox identifier');
  }
  return { login, domain };
}

function parseMailboxAddress(address) {
  const [login, domain] = String(address).split('@');
  if (!login || !domain) {
    throw new Error('Invalid mailbox address');
  }
  return { login, domain };
}

async function fetchJson(url, headers, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Temp-mail provider timeout')), 8000);
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Temp-mail provider error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (attempt < 2) {
      // одна повторная попытка при временных сетевых сбоях
      return fetchJson(url, headers, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
