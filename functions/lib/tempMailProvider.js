const DEFAULT_BASE_URL = 'https://www.1secmail.com/api/v1';
// Default only to domains documented by 1secmail; stale domains were causing provider errors.
const DEFAULT_DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net', 'wwjmp.com', 'esiix.com', 'yoggm.com'];
const DOMAIN_CACHE_MS = 5 * 60 * 1000;
let cachedDomains = null;
let cachedDomainsAt = 0;

export function getTempMailConfigStatus(env) {
  const missing = [];
  const baseUrl = env?.TEMP_MAIL_API_BASE_URL || DEFAULT_BASE_URL;
  if (isMockMode(env)) {
    return { ok: true, missing: [], baseUrl: 'mock' };
  }
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
    const id = crypto.randomUUID();
    return { id, address: `test-${id.slice(0, 8)}@example.test` };
  }

  // Для 1secmail почтовый ящик не требует предварительного создания.
  // Генерируем логин сами, выбираем разрешённый домен и сразу возвращаем адрес.
  const baseUrl = assertConfigured(env);
  const domain = await pickDomain(env, baseUrl);
  const login = generateLogin();
  return {
    id: `${login}:${domain}`,
    address: `${login}@${domain}`,
  };
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
  const headers = { Accept: 'application/json', 'User-Agent': 'good-pass-temp-mail/1.0' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const data = await fetchJson(url, headers);
  return (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id ?? item.messageId,
    from: item.from ?? item.sender ?? '',
    subject: item.subject ?? '(без темы)',
    receivedAt: item.date ?? item.receivedAt ?? item.createdAt,
    isRead: Boolean(item.seen ?? item.isRead ?? false),
  }));
}

export async function getMessage(env, mailboxId, messageId) {
  if (isMockMode(env)) {
    return {
      id: messageId,
      from: 'example@demo.test',
      to: mailboxId.includes('@') ? mailboxId : mailboxId.replace(':', '@'),
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
  const headers = { Accept: 'application/json', 'User-Agent': 'good-pass-temp-mail/1.0' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

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

async function pickDomain(env, baseUrl) {
  const allowList = (env?.TEMP_MAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  if (allowList.length) {
    return allowList[Math.floor(Math.random() * allowList.length)];
  }

  const now = Date.now();
  if (cachedDomains && now - cachedDomainsAt < DOMAIN_CACHE_MS && cachedDomains.length) {
    return cachedDomains[Math.floor(Math.random() * cachedDomains.length)];
  }

  try {
    const liveDomains = await fetchDomainList(env, baseUrl);
    if (Array.isArray(liveDomains) && liveDomains.length) {
      cachedDomains = liveDomains;
      cachedDomainsAt = now;
      return liveDomains[Math.floor(Math.random() * liveDomains.length)];
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'warn',
        msg: 'temp-mail domain list fetch failed, falling back to defaults',
        error: error.message,
        code: error.code,
      })
    );
  }

  return DEFAULT_DOMAINS[Math.floor(Math.random() * DEFAULT_DOMAINS.length)];
}

function generateLogin() {
  const random = crypto.randomUUID().replace(/-/g, '');
  return `gp${random.slice(0, 12)}`;
}

async function fetchDomainList(env, baseUrl) {
  const apiKey = env?.TEMP_MAIL_API_KEY;
  const url = `${baseUrl}/?action=getDomainList`;
  const headers = { Accept: 'application/json', 'User-Agent': 'good-pass-temp-mail/1.0' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const data = await fetchJson(url, headers);
  if (!Array.isArray(data)) return DEFAULT_DOMAINS;
  // Filter to simple domain tokens only to avoid injection from upstream.
  return data.map((d) => String(d).trim()).filter((d) => /^[a-z0-9.-]+$/i.test(d));
}

async function fetchJson(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!response.ok) {
      const errorBody = await safeReadText(response);
      console.error(JSON.stringify({ level: 'error', msg: 'temp-mail provider non-200', status: response.status, errorBody }));
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
