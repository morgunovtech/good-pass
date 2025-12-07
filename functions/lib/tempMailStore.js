const memoryStore = new Map();
const memoryIndex = new Map();
const requestLog = new Map();

const REQUEST_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function saveMailbox(env, record) {
  const ttlSeconds = getTtlSeconds(record.expiresAt);

  if (env?.TEMP_MAIL_STORE) {
    await env.TEMP_MAIL_STORE.put(`mailbox:${record.id}`, JSON.stringify(record), {
      expirationTtl: ttlSeconds,
    });
    await env.TEMP_MAIL_STORE.put(`fingerprint:${record.fingerprint}:${record.id}`, record.id, {
      expirationTtl: ttlSeconds,
    });
    return record;
  }

  memoryStore.set(record.id, record);
  const bucket = memoryIndex.get(record.fingerprint) ?? new Set();
  bucket.add(record.id);
  memoryIndex.set(record.fingerprint, bucket);
  return record;
}

export function isPersistentStoreAvailable(env) {
  return Boolean(env?.TEMP_MAIL_STORE);
}

export async function getMailbox(env, id, now = Date.now()) {
  if (env?.TEMP_MAIL_STORE) {
    const raw = await env.TEMP_MAIL_STORE.get(`mailbox:${id}`);
    return raw ? JSON.parse(raw) : null;
  }
  const record = memoryStore.get(id) ?? null;
  if (record && record.expiresAt <= now) {
    memoryStore.delete(id);
    return null;
  }
  return record;
}

export async function countActiveMailboxes(env, fingerprint, now) {
  if (env?.TEMP_MAIL_STORE) {
    const result = await env.TEMP_MAIL_STORE.list({ prefix: `fingerprint:${fingerprint}:` });
    // KV очищает записи по expirationTtl, поэтому оставшиеся ключи считаем активными
    return result.keys?.length ?? 0;
  }

  const bucket = memoryIndex.get(fingerprint);
  if (!bucket) return 0;

  let count = 0;
  for (const id of bucket) {
    const record = memoryStore.get(id);
    if (!record || record.expiresAt <= now) {
      memoryStore.delete(id);
      bucket.delete(id);
      continue;
    }
    count += 1;
  }
  return count;
}

export function cleanupMemory(now) {
  for (const [id, record] of memoryStore.entries()) {
    if (!record || record.expiresAt <= now) {
      memoryStore.delete(id);
      memoryIndex.get(record?.fingerprint ?? '')?.delete(id);
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

function getTtlSeconds(expiresAt) {
  const diffMs = expiresAt - Date.now();
  // Минимальный TTL 60с, чтобы учесть небольшие расхождения времени
  return Math.max(60, Math.ceil(diffMs / 1000));
}
