// Temp mail provider built around the public 1secmail API (no tokens required).
// Includes a mock mode for offline diagnostics.
const DEFAULT_BASE_URL = 'https://www.1secmail.com/api/v1';
const DEFAULT_DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net'];
const FETCH_TIMEOUT_MS = 8000;

export function getTempMailConfigStatus(env) {
  const baseUrl = env?.TEMP_MAIL_API_BASE_URL || DEFAULT_BASE_URL;
  if (isMockMode(env)) return { ok: true, missing: [], baseUrl: 'mock' };

  const missing = [];
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
  if (isMockMode(env)) {
    const login = `mock${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const domain = 'example.test';
    return { id: `${login}:${domain}`, address: `${login}@${domain}` };
  }

  const baseUrl = assertConfigured(env);
  const allowList = parseAllowList(env?.TEMP_MAIL_DOMAINS);

  // Prefer provider-generated addresses when we are not forcing a domain.
  if (!allowList.length) {
    const generated = await tryGenerateViaApi(baseUrl, env?.TEMP_MAIL_API_KEY);
    if (generated) return generated;
  }

  // Fallback: locally generate login and use allowlist or documented defaults.
  const login = generateLogin();
  const domain = allowList.length ? pickRandom(allowList) : pickRandom(DEFAULT_DOMAINS);
  return { id: `${login}:${domain}`, address: `${login}@${domain}` };
}

export async function listMessages(env, mailboxId) {
  if (isMockMode(env)) {
    return [
      {
        id: 'demo-1',
        from: 'example@demo.test',
        subject: 'Добро пожаловать! (mock)',
        receivedAt: new Date().toISOString(),
        isRead: false,
      },
    ];
  }

  const baseUrl = assertConfigured(env);
  const apiKey = env?.TEMP_MAIL_API_KEY;
  const { login, domain } = parseMailboxIdentifier(mailboxId);
  const url = `${baseUrl}/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`;
  const headers = buildHeaders(apiKey);
  const data = await fetchJson(url, headers);
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id ?? item.messageId ?? String(item._id ?? ''),
    from: item.from ?? item.sender ?? '',
    subject: item.subject ?? '(без темы)',
    receivedAt: item.date ?? item.receivedAt ?? item.createdAt,
    isRead: Boolean(item.seen ?? item.isRead ?? false),
  }));
}

export async function getMessage(env, mailboxId, messageId) {
  if (isMockMode(env)) {
    const address = mailboxId.includes('@') ? mailboxId : mailboxId.replace(':', '@');
    return {
      id: messageId,
      from: 'example@demo.test',
      to: address,
      subject: 'Тестовое письмо (mock)',
      receivedAt: new Date().toISOString(),
      textBody: 'Это пример письма из мок-провайдера. Сервис подключен корректно.',
      htmlBody: '<p><strong>Это пример письма</strong> из мок-провайдера. Сервис подключен корректно.</p>',
    };
  }

  const baseUrl = assertConfigured(env);
  const apiKey = env?.TEMP_MAIL_API_KEY;
  const { login, domain } = parseMailboxIdentifier(mailboxId);
  const url = `${baseUrl}/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(messageId)}`;
  const headers = buildHeaders(apiKey);
  const data = await fetchJson(url, headers);
  return {
    id: data.id ?? data.messageId ?? messageId,
    from: data.from ?? data.sender ?? '',
    to: data.to ?? data.recipient ?? '',
    subject: data.subject ?? '(без темы)',
    receivedAt: data.date ?? data.receivedAt ?? data.createdAt,
    textBody: data.textBody ?? data.text ?? data.body ?? '',
    htmlBody: data.htmlBody ?? data.html ?? data.body ?? '',
  };
}

function parseMailboxIdentifier(mailboxId) {
  if (!mailboxId) throw new Error('Missing mailbox id');
  if (mailboxId.includes('@')) return parseMailboxAddress(mailboxId);
  const [login, domain] = String(mailboxId).split(':');
  if (!login || !domain) throw new Error('Invalid mailbox identifier');
  return { login, domain };
}

function parseMailboxAddress(address) {
  const [login, domain] = String(address).split('@');
  if (!login || !domain) throw new Error('Invalid mailbox address');
  return { login, domain };
}

function parseAllowList(raw) {
  return (raw || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

function generateLogin() {
  return `gp${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function tryGenerateViaApi(baseUrl, apiKey) {
  try {
    const url = `${baseUrl}/?action=genRandomMailbox&count=1`;
    const headers = buildHeaders(apiKey);
    const data = await fetchJson(url, headers);
    const address = Array.isArray(data) ? data[0] : null;
    if (!address || !String(address).includes('@')) return null;
    const { login, domain } = parseMailboxAddress(address);
    return { id: `${login}:${domain}`, address: `${login}@${domain}` };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'temp-mail provider genRandomMailbox failed; falling back to local generation',
        error: error.message,
        code: error.code,
        details: error.details,
      })
    );
    return null;
  }
}

function buildHeaders(apiKey) {
  const headers = { Accept: 'application/json', 'User-Agent': 'good-pass-temp-mail/1.0' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}

async function fetchJson(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!response.ok) {
      const errorBody = await safeReadText(response);
      console.error(
        JSON.stringify({ level: 'error', msg: 'temp-mail provider non-200', status: response.status, errorBody })
      );
      const error = new Error(`Temp-mail provider error: ${response.status}`);
      error.code = 'provider_unavailable';
      error.details = errorBody;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Temp-mail provider timeout');
      timeoutError.code = 'provider_timeout';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isMockMode(env) {
  return (env?.TEMP_MAIL_MODE || '').toLowerCase() === 'mock';
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (error) {
    return 'unreadable_body';
  }
}
