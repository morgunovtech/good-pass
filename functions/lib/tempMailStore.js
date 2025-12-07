const memoryStore = new Map();
const requestLog = new Map();

const ACTIVE_LIMIT_PER_IP = 3;
const REQUEST_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function saveMailbox(env, record) {
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
