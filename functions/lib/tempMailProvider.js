const DEFAULT_BASE_URL = 'https://www.1secmail.com/api/v1';
const DEFAULT_DOMAINS = [
  '1secmail.com',
  '1secmail.org',
  '1secmail.net',
  'wwjmp.com',
  'icznn.com',
  'ezztt.com',
  'vddaz.com',
  'oosln.com',
  'vjuum.com',
  'txcct.com',
];

export function getTempMailConfigStatus(env) {
  const mode = resolveMode(env);
  if (mode === 'mock') {
    return { ok: true, missing: [], baseUrl: null, mode };
  }

  const missing = [];
  const baseUrl = env?.TEMP_MAIL_API_BASE_URL || DEFAULT_BASE_URL;
  if (!baseUrl) missing.push('TEMP_MAIL_API_BASE_URL');
  if (env?.TEMP_MAIL_API_REQUIRE_KEY === 'true' && !env?.TEMP_MAIL_API_KEY) {
    missing.push('TEMP_MAIL_API_KEY');
  }
  return { ok: missing.length === 0, missing, baseUrl, mode };
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
  // Для 1secmail почтовый ящик не требует предварительного создания.
  // Генерируем логин сами, выбираем разрешённый домен и сразу возвращаем адрес.
  const mode = resolveMode(env);
  if (mode === 'mock') {
    return mockCreateMailbox(env);
  }

  assertConfigured(env);
  const domain = pickDomain(env);
  const login = generateLogin();
  return {
    id: `${login}:${domain}`,
    address: `${login}@${domain}`,
  };
}

export async function listMessages(env, mailboxId) {
  const mode = resolveMode(env);
  if (mode === 'mock') {
    return mockListMessages();
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
  const mode = resolveMode(env);
  if (mode === 'mock') {
    return mockGetMessage(messageId);
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

function pickDomain(env) {
  const allowList = (env?.TEMP_MAIL_DOMAINS || '').split(',').map((d) => d.trim()).filter(Boolean);
  const domains = allowList.length ? allowList : DEFAULT_DOMAINS;
  const index = Math.floor(Math.random() * domains.length);
  return domains[index];
}

function generateLogin() {
  const random = crypto.randomUUID().replace(/-/g, '');
  return `gp${random.slice(0, 12)}`;
}

async function fetchJson(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      console.error(
        JSON.stringify({ ts: new Date().toISOString(), level: 'error', service: 'temp-mail-provider', msg: 'provider HTTP error',
          context: { status: response.status, url, body: text.slice(0, 500) } })
      );
      const error = new Error(`Temp-mail provider error: ${response.status}`);
      error.code = 'provider_unavailable';
      error.status = response.status;
      error.body = text;
      throw error;
    }
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error(
        JSON.stringify({ ts: new Date().toISOString(), level: 'error', service: 'temp-mail-provider', msg: 'provider JSON parse error',
          context: { url, body: text.slice(0, 500) } })
      );
      const error = new Error('Invalid JSON from temp-mail provider');
      error.code = 'provider_invalid_payload';
      error.body = text;
      throw error;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Temp-mail provider timeout');
      timeoutError.code = 'provider_timeout';
      throw timeoutError;
    }
    if (!error.code) {
      error.code = 'provider_unavailable';
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveMode(env) {
  return String(env?.TEMP_MAIL_MODE || '').toLowerCase() === 'mock' ? 'mock' : 'live';
}

function mockCreateMailbox(env) {
  const domain = (env?.TEMP_MAIL_DOMAINS || 'example.com').split(',').map((d) => d.trim()).filter(Boolean)[0] || 'example.com';
  const login = generateLogin();
  return { id: `${login}:${domain}`, address: `${login}@${domain}` };
}

function mockListMessages() {
  const now = new Date();
  return [
    { id: 'demo-1', from: 'welcome@example.com', subject: 'Добро пожаловать', receivedAt: now.toISOString(), isRead: false },
    {
      id: 'demo-2',
      from: 'no-reply@example.com',
      subject: 'Тестовое письмо',
      receivedAt: new Date(now.getTime() - 2 * 60000).toISOString(),
      isRead: true,
    },
  ];
}

function mockGetMessage(messageId) {
  return {
    id: messageId,
    from: 'welcome@example.com',
    to: 'you@example.com',
    subject: 'Добро пожаловать',
    receivedAt: new Date().toISOString(),
    textBody: 'Это демонстрационное письмо. Подключите реальный провайдер, чтобы получать живые сообщения.',
    htmlBody: '<p>Это демонстрационное письмо. Подключите реальный провайдер, чтобы получать живые сообщения.</p>',
  };
}
