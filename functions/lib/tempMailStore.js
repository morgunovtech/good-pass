const memoryStore = new Map();
const requestLog = new Map();

const ACTIVE_LIMIT_PER_IP = 3;
const REQUEST_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const DEFAULT_TOKEN_SECRET = 'temp-mail-demo-secret';

export async function saveMailbox(env, record) {
  // Persist if KV is available; the sealed token keeps the flow working even without stateful storage.
  if (env?.TEMP_MAIL_STORE) {
    const key = `mailbox:${record.id}`;
    const expiration = Math.floor(record.expiresAt / 1000);
    await env.TEMP_MAIL_STORE.put(key, JSON.stringify(record), { expiration });
    return record;
  }

  memoryStore.set(record.id, record);
  return record;
}

export async function getMailbox(env, id) {
  if (env?.TEMP_MAIL_STORE) {
    const raw = await env.TEMP_MAIL_STORE.get(`mailbox:${id}`);
    return raw ? JSON.parse(raw) : null;
  }
  return memoryStore.get(id) ?? null;
}

export async function countActiveMailboxes(env, fingerprint, now) {
  if (env?.TEMP_MAIL_STORE) {
    // TODO: Replace with provider-specific scan/query if KV listing is enabled.
    // For KV without listing, consider adding a secondary index or Durable Object.
    return 0;
  }

  let count = 0;
  for (const record of memoryStore.values()) {
    if (record.expiresAt > now && record.fingerprint === fingerprint) {
      count += 1;
    }
  }
  return count;
}

export function cleanupMemory(now) {
  for (const [id, record] of memoryStore.entries()) {
    if (!record || record.expiresAt <= now) {
      memoryStore.delete(id);
    }
  }
}

export function enforceRateLimit(fingerprint, now = Date.now()) {
  const bucket = requestLog.get(fingerprint) ?? [];
  const fresh = bucket.filter((ts) => now - ts < REQUEST_WINDOW_MS);
  fresh.push(now);
  requestLog.set(fingerprint, fresh);
  if (fresh.length > MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  return true;
}

export function hashFingerprint(ip, userAgent = '') {
  const data = `${ip}|${userAgent}`;
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(data))
    .then((buffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join(''));
}

export async function sealMailboxRecord(env, record) {
  const secret = env?.TEMP_MAIL_TOKEN_SECRET || DEFAULT_TOKEN_SECRET;
  const payload = {
    id: record.id,
    address: record.address,
    providerMailboxId: record.providerMailboxId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    fingerprint: record.fingerprint,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSignature(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function unsealMailboxRecord(env, token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) return null;
  const secret = env?.TEMP_MAIL_TOKEN_SECRET || DEFAULT_TOKEN_SECRET;
  const valid = await verifyHmac(secret, encodedPayload, providedSignature);
  if (!valid) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function resolveMailbox(env, id, token) {
  const stored = await getMailbox(env, id);
  if (stored) return stored;
  const sealed = await unsealMailboxRecord(env, token);
  if (sealed && sealed.id === id) {
    return { ...sealed, accessToken: token };
  }
  return null;
}

async function hmacSignature(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifyHmac(secret, message, expectedSignature) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const signatureBuffer = base64UrlToBuffer(expectedSignature);
  return crypto.subtle.verify('HMAC', key, signatureBuffer, new TextEncoder().encode(message));
}

function base64UrlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  const base64 = bufferToBase64(bytes);
  return base64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const bytes = base64ToBuffer(padded);
  return new TextDecoder().decode(bytes);
}

function base64UrlToBuffer(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return base64ToBuffer(padded);
}

function bufferToBase64(bytes) {
  // Cloudflare Workers do not expose Buffer, so use web-safe base64 helpers with a Node fallback.
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBuffer(base64) {
  // Cloudflare Workers do not expose Buffer, so use web-safe base64 helpers with a Node fallback.
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
